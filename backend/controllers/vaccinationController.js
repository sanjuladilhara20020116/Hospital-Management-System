// backend/controllers/vaccinationController.js
const path = require('path');
const fs = require('fs');
const VaccinationRecord = require('../models/VaccinationRecord');
const User = require('../models/User');
const generateVaccinationCertNo = require('../utils/generateVaccinationCertNo');
const { buildVaccinationCertificatePDF } = require('../utils/certificatePdf');
const { sendMail } = require('../utils/mailer');

const uploadsDir = path.join(__dirname, '..', 'uploads');

// ---------- helpers ----------
async function findPatient({ patientMongoId, patientUserId, patientEmail }) {
  if (patientMongoId) {
    const u = await User.findById(patientMongoId);
    if (u && u.role === 'Patient') return u;
  }
  if (patientUserId) {
    const u = await User.findOne({ userId: patientUserId, role: 'Patient' });
    if (u) return u;
  }
  if (patientEmail) {
    const u = await User.findOne({ email: patientEmail, role: 'Patient' });
    if (u) return u;
  }
  return null;
}

function getDoctorIdFromReq(req) {
  // No-JWT: req.user is set by middleware/actor.js (actorFromHeader)
  if (req.user && req.user.role === 'Doctor') {
    return req.user._id || req.user.id || null;
  }
  return null;
}

// ---------- controllers ----------

// POST /api/vaccinations
exports.createVaccination = async (req, res) => {
  try {
    const {
      patientMongoId, patientUserId, patientEmail,
      vaccineName, manufacturer, batchLotNo, expiryDate,
      doseNumber, route, site, dateAdministered, notes
    } = req.body;

    const doctorId = getDoctorIdFromReq(req);
    if (!doctorId) return res.status(401).json({ message: 'Doctor not authenticated' });

    if (!vaccineName || !batchLotNo) {
      return res.status(400).json({ message: 'vaccineName and batchLotNo are required' });
    }

    const patient = await findPatient({ patientMongoId, patientUserId, patientEmail });
    if (!patient) return res.status(404).json({ message: 'Patient not found (by id/email)' });

    const doctor = await User.findById(doctorId).select('firstName lastName slmcRegistrationNumber role');
    if (!doctor || doctor.role !== 'Doctor') {
      return res.status(403).json({ message: 'Only Doctors can create vaccination records' });
    }

    // Unique certificate number (retry a few times on collision)
    let certificateNumber = generateVaccinationCertNo();
    for (let i = 0; i < 3; i++) {
      const exists = await VaccinationRecord.findOne({ certificateNumber }).lean();
      if (!exists) break;
      certificateNumber = generateVaccinationCertNo();
    }

    // Create record
    let record = await VaccinationRecord.create({
      patient: patient._id,
      doctor: doctor._id,
      vaccineName,
      manufacturer,
      batchLotNo,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      doseNumber: doseNumber || 1,
      route: route || 'IM',
      site: site || 'Left Deltoid',
      dateAdministered: dateAdministered ? new Date(dateAdministered) : new Date(),
      notes,
      certificateNumber,
    });

    // Build PDF (non-fatal if it fails)
    let pdfInfo = null;
    try {
      const built = await buildVaccinationCertificatePDF({
        record,
        patient,
        doctor,
        hospitalName: process.env.HOSPITAL_NAME || 'Hospital',
      });
      pdfInfo = built;
      record.certificatePdfFile = built.relativePath;
      record.issuedAt = new Date();
      await record.save();
    } catch (err) {
      console.error('PDF generation error:', err);
    }

    // Email (non-blocking)
    let emailed = false;
    try {
      if (patient.email && record.certificatePdfFile) {
        await sendMail({
          from: process.env.FROM_EMAIL || 'Hospital <no-reply@localhost>',
          to: patient.email,
          subject: `Your Vaccination Certificate – ${record.vaccineName}`,
          html: `
            <p>Dear ${patient.firstName || 'Patient'},</p>
            <p>Your vaccination on ${new Date(record.dateAdministered).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })} has been recorded.</p>
            <p>Vaccine: <b>${record.vaccineName}</b> (Dose ${record.doseNumber || 1})</p>
            <p>You can also download it anytime from your patient portal.</p>
            <p>Regards,<br/>${process.env.HOSPITAL_NAME || 'Hospital'}</p>
          `,
          attachments: [
            {
              filename: `${record.certificateNumber}.pdf`,
              path: path.join(uploadsDir, record.certificatePdfFile),
              contentType: 'application/pdf',
            },
          ],
        });
        record.emailedAt = new Date();
        await record.save();
        emailed = true;
      }
    } catch (err) {
      console.error('Email send error:', err);
    }

    return res.status(201).json({
      _id: record._id,
      certificateNumber: record.certificateNumber,
      pdfReady: Boolean(record.certificatePdfFile),
      emailSent: emailed,
      message: !pdfInfo
        ? 'Vaccination saved, but PDF generation failed. Try regenerate later.'
        : (emailed ? 'Vaccination saved, PDF generated & emailed.' : 'Vaccination saved & PDF generated. Email failed or no email.'),
    });
  } catch (err) {
    console.error('createVaccination error:', err);
    return res.status(500).json({ message: 'Server error creating vaccination' });
  }
};

// GET /api/vaccinations/mine  (Patient)
exports.listMineForPatient = async (req, res) => {
  try {
    const patientId = req.user?._id || req.user?.id;
    if (!patientId) return res.status(401).json({ message: 'Patient not authenticated' });

    const items = await VaccinationRecord.find({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.json(items);
  } catch (err) {
    console.error('listMineForPatient error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/vaccinations/doctor  (Doctor)
exports.listForDoctor = async (req, res) => {
  try {
    const doctorId = getDoctorIdFromReq(req);
    if (!doctorId) return res.status(401).json({ message: 'Doctor not authenticated' });

    const { patientUserId, from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.dateAdministered = {};
      if (from) filter.dateAdministered.$gte = new Date(from);
      if (to) filter.dateAdministered.$lte = new Date(to);
    }
    if (patientUserId) {
      const p = await User.findOne({ userId: patientUserId, role: 'Patient' }).select('_id');
      if (p) filter.patient = p._id;
    }

    const items = await VaccinationRecord.find(filter)
      .populate('patient', 'firstName lastName userId')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.json(items);
  } catch (err) {
    console.error('listForDoctor error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/vaccinations/:id  (owner or doctor)
exports.getOne = async (req, res) => {
  try {
    const rec = await VaccinationRecord.findById(req.params.id)
      .populate('patient', 'firstName lastName userId email')
      .populate('doctor', 'firstName lastName');
    if (!rec) return res.status(404).json({ message: 'Not found' });

    const isOwner = String(rec.patient._id) === String(req.user?._id || '');
    const isDoctor = req.user?.role === 'Doctor';
    if (!isOwner && !isDoctor) return res.status(403).json({ message: 'Forbidden' });

    return res.json(rec);
  } catch (err) {
    console.error('getOne error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/vaccinations/:id/pdf (owner or doctor)
exports.downloadPdf = async (req, res) => {
  try {
    const rec = await VaccinationRecord.findById(req.params.id).populate('patient', '_id');
    if (!rec) return res.status(404).json({ message: 'Not found' });

    const isOwner = String(rec.patient._id) === String(req.user?._id || '');
    const isDoctor = req.user?.role === 'Doctor';
    if (!isOwner && !isDoctor) return res.status(403).json({ message: 'Forbidden' });

    if (!rec.certificatePdfFile) return res.status(404).json({ message: 'PDF not generated' });

    const absolute = path.join(uploadsDir, rec.certificatePdfFile);
    if (!fs.existsSync(absolute)) return res.status(404).json({ message: 'PDF not found on server' });

    return res.download(absolute, path.basename(absolute));
  } catch (err) {
    console.error('downloadPdf error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/vaccinations/:id/resend  (Doctor)
exports.resendEmail = async (req, res) => {
  try {
    const doctorId = getDoctorIdFromReq(req);
    if (!doctorId) return res.status(401).json({ message: 'Doctor not authenticated' });

    const rec = await VaccinationRecord.findById(req.params.id)
      .populate('patient', 'firstName email')
      .populate('doctor', 'firstName lastName');
    if (!rec) return res.status(404).json({ message: 'Not found' });

    if (!rec.certificatePdfFile) return res.status(400).json({ message: 'No PDF to send' });
    if (!rec.patient?.email) return res.status(400).json({ message: 'Patient has no email' });

    await sendMail({
      from: process.env.FROM_EMAIL || 'Hospital <no-reply@localhost>',
      to: rec.patient.email,
      subject: `Your Vaccination Certificate – ${rec.vaccineName}`,
      html: `
        <p>Dear ${rec.patient.firstName || 'Patient'},</p>
        <p>Resending your vaccination certificate for ${rec.vaccineName} (Dose ${rec.doseNumber || 1}).</p>
        <p>Regards,<br/>${process.env.HOSPITAL_NAME || 'Hospital'}</p>
      `,
      attachments: [
        {
          filename: `${rec.certificateNumber}.pdf`,
          path: path.join(uploadsDir, rec.certificatePdfFile),
          contentType: 'application/pdf',
        },
      ],
    });

    rec.emailedAt = new Date();
    await rec.save();

    return res.json({ ok: true, message: 'Email sent' });
  } catch (err) {
    console.error('resendEmail error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/vaccinations/:id  (Doctor)
exports.updateRecord = async (req, res) => {
  try {
    const doctorId = getDoctorIdFromReq(req);
    if (!doctorId) return res.status(401).json({ message: 'Doctor not authenticated' });

    const editable = [
      'vaccineName','manufacturer','batchLotNo','expiryDate',
      'doseNumber','route','site','dateAdministered','notes','voided','voidReason'
    ];

    const rec = await VaccinationRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found' });

    editable.forEach((k) => {
      if (k in req.body) {
        rec[k] = (k === 'expiryDate' || k === 'dateAdministered')
          ? (req.body[k] ? new Date(req.body[k]) : undefined)
          : req.body[k];
      }
    });

    await rec.save();

    return res.json({
      ok: true,
      message: rec.certificatePdfFile
        ? 'Record updated. NOTE: existing PDF not regenerated automatically.'
        : 'Record updated.',
      record: rec,
    });
  } catch (err) {
    console.error('updateRecord error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/vaccinations/:id  (Doctor)
exports.deleteRecord = async (req, res) => {
  try {
    const doctorId = getDoctorIdFromReq(req);
    if (!doctorId) return res.status(401).json({ message: 'Doctor not authenticated' });

    const rec = await VaccinationRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found' });

    if (rec.certificatePdfFile) {
      const absolute = path.join(uploadsDir, rec.certificatePdfFile);
      try {
        if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
      } catch (_) {
        // ignore unlink errors
      }
    }

    await rec.deleteOne();
    return res.json({ ok: true, message: 'Record deleted' });
  } catch (err) {
    console.error('deleteRecord error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
