// backend/utils/certificatePdf.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const CERTS_SUBDIR = 'vaccination-certificates';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Build a vaccination certificate PDF (NO QR).
 * @param {Object} params
 * @param {Object} params.record - VaccinationRecord doc (plain or mongoose doc)
 * @param {Object} params.patient - User { firstName, lastName, nicNumber, dateOfBirth, userId, email }
 * @param {Object} params.doctor  - User { firstName, lastName, slmcRegistrationNumber }
 * @param {String} [params.hospitalName] - optional header
 * @returns {Promise<{relativePath: string, absolutePath: string}>}
 */
async function buildVaccinationCertificatePDF({ record, patient, doctor, hospitalName = process.env.HOSPITAL_NAME || 'Hospital' }) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const certsDir = path.join(uploadsDir, CERTS_SUBDIR);
  ensureDir(certsDir);

  const fileName = `${record.certificateNumber}.pdf`;
  const absolutePath = path.join(certsDir, fileName);
  const relativePath = path.join(CERTS_SUBDIR, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const outStream = fs.createWriteStream(absolutePath);
  doc.pipe(outStream);

  // Header
  doc
    .fontSize(18)
    .text(hospitalName, { align: 'center' })
    .moveDown(0.2)
    .fontSize(12)
    .text('Outpatient Department (OPD)', { align: 'center' })
    .moveDown(0.8)
    .fontSize(16)
    .text('Vaccination Certificate', { align: 'center', underline: true })
    .moveDown(1.2);

  const dateStr = new Date(record.dateAdministered || Date.now()).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });
  const issuedStr = new Date(record.issuedAt || Date.now()).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

  // Patient block
  doc.fontSize(12).text('Patient Details', { underline: true });
  doc.moveDown(0.3);
  doc.text(`Name: ${patient.firstName || ''} ${patient.lastName || ''}`);
  if (patient.nicNumber) doc.text(`NIC: ${patient.nicNumber}`);
  if (patient.dateOfBirth) doc.text(`DOB: ${new Date(patient.dateOfBirth).toLocaleDateString('en-LK')}`);
  if (patient.userId) doc.text(`Patient ID: ${patient.userId}`);
  doc.moveDown(0.8);

  // Vaccine block
  doc.fontSize(12).text('Vaccination Details', { underline: true });
  doc.moveDown(0.3);
  doc.text(`Vaccine: ${record.vaccineName}`);
  if (record.manufacturer) doc.text(`Manufacturer: ${record.manufacturer}`);
  doc.text(`Batch / Lot No: ${record.batchLotNo}`);
  if (record.expiryDate) doc.text(`Expiry Date: ${new Date(record.expiryDate).toLocaleDateString('en-LK')}`);
  doc.text(`Dose: ${record.doseNumber || 1}`);
  doc.text(`Route/Site: ${record.route || 'IM'} / ${record.site || ''}`);
  doc.text(`Date/Time Administered: ${dateStr}`);
  if (record.notes) { doc.moveDown(0.2); doc.text(`Notes: ${record.notes}`); }
  doc.moveDown(0.8);

  // Doctor block
  doc.fontSize(12).text('Administered By', { underline: true });
  doc.moveDown(0.3);
  doc.text(`Doctor: Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`);
  if (doctor.slmcRegistrationNumber) doc.text(`SLMC Reg. No: ${doctor.slmcRegistrationNumber}`);
  doc.moveDown(1.2);

  // Footer
  doc
    .fontSize(10)
    .text(`Certificate No: ${record.certificateNumber}`, { align: 'left' })
    .text(`Issued At: ${issuedStr}`, { align: 'left' })
    .moveDown(0.2)
    .text('This certificate is generated electronically by the OPD system.', { align: 'left' });

  doc.end();

  await new Promise((resolve, reject) => {
    outStream.on('finish', resolve);
    outStream.on('error', reject);
  });

  return { relativePath, absolutePath };
}

module.exports = { buildVaccinationCertificatePDF, CERTS_SUBDIR };
