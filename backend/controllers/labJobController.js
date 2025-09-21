// controllers/labJobController.js
const fs = require('fs');
const path = require('path');
const LabJob = require('../models/LabJob');
const User = require('../models/User');
const generateReferenceNo = require('../utils/generateReferenceNo');
const { sendMail, buildCompletedEmail } = require('../utils/mailer');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const labReportsDir = uploadsDir; // we save into /uploads via shared uploader

// CREATE (owner = actorLabAdmin._id)
exports.createLabJob = async (req, res) => {
  try {
    const { patientName, patientId, testType, scheduledDate, timeSlot } = req.body;

    // actor comes from middleware/actorLabAdmin
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    // link Patient
    const patient = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const referenceNo = await generateReferenceNo();

    const newJob = await LabJob.create({
      referenceNo,
      patientName,
      patientId,
      patientRef: patient._id,
      testType,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      timeSlot: timeSlot || undefined,
      createdBy: ownerId
    });

    res.status(201).json(newJob);
  } catch (err) {
    console.error('createLabJob error:', err);
    res.status(500).json({ message: 'Server error creating job' });
  }
};

// LIST (only own jobs)
// LIST (only own jobs)
// LIST (only own jobs)  -- partial search + referenceNo
exports.getLabJobs = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const page  = Math.max(parseInt(req.query.page  || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip  = (page - 1) * limit;

    const filter = { createdBy: ownerId };

    // helper to escape regex specials for safe contains search
    const escape = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const { status, patientId, testType, referenceNo } = req.query;

    if (status) filter.status = status;

    // contains (case-insensitive): works for last-digits typing
    if (patientId)   filter.patientId   = { $regex: escape(patientId),   $options: 'i' };
    if (testType)    filter.testType    = { $regex: escape(testType),    $options: 'i' };
    if (referenceNo) filter.referenceNo = { $regex: escape(referenceNo), $options: 'i' };

    const [items, total] = await Promise.all([
      LabJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LabJob.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('getLabJobs error:', err);
    res.status(500).json({ message: 'Server error fetching jobs' });
  }
};



// UPDATE (Pending only, owner-only)
exports.updateLabJob = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const job = await LabJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (String(job.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Forbidden' });
    if (job.status === 'Completed') return res.status(409).json({ message: 'Cannot edit a completed job' });

    const { patientName, patientId, testType, scheduledDate, timeSlot } = req.body;

    if (patientName !== undefined) job.patientName = patientName;
    if (testType    !== undefined) job.testType    = testType;
    if (scheduledDate !== undefined) job.scheduledDate = new Date(scheduledDate);
    if (timeSlot !== undefined) {
  job.timeSlot = timeSlot ? timeSlot : undefined;   // ← empty string unsets it
}

    if (patientId !== undefined && patientId !== job.patientId) {
      const patient = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id');
      if (!patient) return res.status(404).json({ message: 'Patient not found' });
      job.patientId = patientId;
      job.patientRef = patient._id;
    }

    await job.save();
    res.json({ message: 'Job updated', job });
  } catch (err) {
    console.error('updateLabJob error:', err);
    res.status(500).json({ message: 'Server error updating job' });
  }
};

// DELETE (Pending only, owner-only)
exports.deleteLabJob = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const job = await LabJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (String(job.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Forbidden' });
    if (job.status === 'Completed') return res.status(409).json({ message: 'Cannot delete a completed job' });

    await job.deleteOne();
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('deleteLabJob error:', err);
    res.status(500).json({ message: 'Server error deleting job' });
  }
};

// UPLOAD REPORT (owner-only, finalize)
exports.uploadLabReport = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const job = await LabJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (String(job.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Forbidden' });
    if (job.status === 'Completed') return res.status(409).json({ message: 'Job already completed' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    // store filename only (existing behavior)
    job.reportFile = req.file.filename;
    job.status = 'Completed';
    job.completedAt = new Date();
    await job.save();

    /* --- NEW: create/ensure LabReport doc for this file (non-breaking) --- */
    try {
      const LabReport = require('../models/LabReport');
      const absolutePath = path.join(labReportsDir, job.reportFile); // this is where you saved the file
      const reportType = job.testType; // e.g., "Cholesterol"

      // Create a LabReport record if one doesn't already exist for this file+patient
      let labReport = await LabReport.findOne({
        patientId: job.patientRef,           // ObjectId to User
        reportType,
        filePath: absolutePath
      });

      if (!labReport) {
        labReport = await LabReport.create({
          patientId: job.patientRef,
          reportType,
          filePath: absolutePath,
          uploadDate: job.completedAt
        });
      }
      // include created/linked id in response
      req.createdLabReportId = labReport._id;
    } catch (e) {
      console.warn('⚠️ Could not create LabReport record:', e.message);
    }
    /* --- END NEW --- */

    // ---- EMAIL NOTIFICATION (existing) ----
    try {
      const patient = await User.findById(job.patientRef).select('email firstName lastName');
      if (patient?.email) {
        const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
        const APP_BASE_URL = process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
        const link = `${APP_BASE_URL}/lab-report?ref=${encodeURIComponent(job.referenceNo)}`;
        const html = buildCompletedEmail({
          patientName, referenceNo: job.referenceNo, testType: job.testType,
          completedAt: job.completedAt, link,
        });
        await sendMail({ to: patient.email, subject: `Your ${job.testType} lab report is ready (Ref: ${job.referenceNo})`, html });
        console.log('✅ Email sent to', patient.email, 'for ref', job.referenceNo);
      } else {
        console.warn('⚠️  No email on patient record for', job.patientId);
      }
    } catch (mailErr) {
      console.error('❌ Email send failed:', mailErr.message);
    }

    // include the LabReport id if we created it
    res.json({ message: 'Report uploaded successfully', job, labReportId: req.createdLabReportId || null });
  } catch (err) {
    console.error('uploadLabReport error:', err);
    res.status(500).json({ message: 'Server error uploading report' });
  }
};


// DOWNLOAD (owner-only)
exports.downloadReport = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const job = await LabJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (String(job.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Forbidden' });
    if (!job.reportFile) return res.status(404).json({ message: 'Report file not found' });

    const abs = path.join(labReportsDir, job.reportFile);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'Report file not found' });

    return res.download(abs, path.basename(abs));
  } catch (err) {
    console.error('downloadReport error:', err);
    res.status(500).json({ message: 'Server error downloading report' });
  }
};

// REPEAT ORDER
exports.repeatLabJob = async (req, res) => {
  try {
    const ownerId = req.actorLabAdminId;
    if (!ownerId) return res.status(401).json({ message: 'Missing Lab Admin' });

    const orig = await LabJob.findById(req.params.id);
    if (!orig) return res.status(404).json({ message: 'Original job not found' });
    if (String(orig.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Forbidden' });

    const {
      scheduledDate = new Date(),
      patientName = orig.patientName,
      testType = orig.testType
    } = req.body || {};

    const patient = await User.findOne({ userId: orig.patientId, role: 'Patient' }).select('_id');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const referenceNo = await generateReferenceNo();

    const newJob = await LabJob.create({
      referenceNo,
      patientName,
      patientId: orig.patientId,
      patientRef: patient._id,
      testType,
      status: 'Pending',
      scheduledDate: new Date(scheduledDate),
      createdBy: ownerId
    });

    res.status(201).json(newJob);
  } catch (err) {
    console.error('repeatLabJob error:', err);
    res.status(500).json({ message: 'Server error creating repeat order' });
  }
};
