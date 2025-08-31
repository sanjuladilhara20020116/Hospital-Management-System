// utils/VacciCertificatePdf.js
// Clean A4 Vaccination Certificate renderer using pdfkit.
// Exports buildVaccinationCertificatePDF({ record, patient, doctor, hospitalName })

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CERT_DIR = path.join(UPLOADS_DIR, 'certificates');

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
}

function fmtColomboDateTime(d) {
  try { return new Date(d).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' }); }
  catch { return new Date(d).toLocaleString(); }
}

function fmtColomboDate(d) {
  try { return new Date(d).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo' }); }
  catch { return new Date(d).toLocaleDateString(); }
}

function hLine(doc, x1, x2, y, gray = 0.85) {
  doc.save().strokeColor(gray).moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

function sectionTitle(doc, label, y) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111').text(label, 50, y);
  hLine(doc, 50, 545, y + 14);
  return y + 22;
}

function labelValue(doc, label, value, x, y, wLabel = 120, wValue = 200) {
  const v = value == null || value === '' ? '-' : String(value);
  doc.fontSize(10).fillColor('#444').font('Helvetica-Bold').text(label, x, y, { width: wLabel });
  doc.font('Helvetica').fillColor('#111').text(v, x + wLabel + 8, y, { width: wValue });
  const lh = Math.max(
    doc.heightOfString(label, { width: wLabel }),
    doc.heightOfString(v, { width: wValue })
  );
  return y + lh + 2;
}

function drawDetailsTable(doc, startY, row) {
  const x = 50;
  // Tweaked widths to keep "IM / Left Deltoid" on one line
  const widths = [130, 130, 60, 85, 90]; // Vaccine | Manufacturer | Dose | Batch/Expiry | Route/Site
  const headers = ['Vaccine', 'Manufacturer', 'Dose', 'Batch / Expiry', 'Route / Site'];
  const totalW = widths.reduce((a, b) => a + b, 0);

  // Header bar (slightly taller for breathing room)
  const headerH = 22;
  doc.save()
    .rect(x, startY, totalW, headerH)
    .fill('#f3f4f6')
    .fillColor('#111')
    .font('Helvetica-Bold').fontSize(10);

  let cx = x;
  headers.forEach((h, i) => {
    doc.text(h, cx + 6, startY + 7, { width: widths[i] - 12 });
    cx += widths[i];
  });
  doc.restore();

  // First data row starts just below the header
  const y = startY + headerH;

  doc.save().font('Helvetica').fontSize(10).fillColor('#111');
  let c = x;

  // Vaccine
  doc.text(row.vaccine || '-', c + 6, y + 6, { width: widths[0] - 12 }); c += widths[0];

  // Manufacturer
  doc.text(row.manufacturer || '-', c + 6, y + 6, { width: widths[1] - 12 }); c += widths[1];

  // Dose (centered)
  doc.text(row.dose || '-', c + 6, y + 6, { width: widths[2] - 12, align: 'center' }); c += widths[2];

  // Batch / Expiry
  const batchCell = [row.batch || '-', row.expiry ? `Exp: ${row.expiry}` : null].filter(Boolean).join('\n');
  doc.text(batchCell, c + 6, y + 4, { width: widths[3] - 12 }); c += widths[3];

  // Route / Site (single line)
  const routeSite = [row.route || '-', row.site || ''].filter(Boolean).join(' / ');
  doc.text(routeSite, c + 6, y + 6, { width: widths[4] - 12 });
  doc.restore();

  // Underline row
  hLine(doc, x, x + totalW, y, 0.9);

  // Row height ~24px
  return y + 24;
}

function drawVoidedWatermark(doc, voided) {
  if (!voided) return;
  doc.save()
    .font('Helvetica-Bold').fontSize(120)
    .fillColor('#e11d48').opacity(0.12)
    .rotate(-20, { origin: [300, 420] })
    .text('VOIDED', 120, 340, { align: 'center' })
    .restore()
    .opacity(1);
}

function sanitizeFileName(s, fallback) {
  const base = (s && String(s)) || String(fallback || 'certificate');
  return base.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120);
}

async function writePdfToFile(doc, absolutePath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(absolutePath);
    doc.pipe(out);
    doc.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

/**
 * Build the vaccination certificate PDF.
 * @param {Object} opts
 * @param {Object} opts.record  - VaccinationRecord (may include populated patient/doctor)
 * @param {Object} [opts.patient] - Populated patient (if not already on record)
 * @param {Object} [opts.doctor]  - Populated doctor (if not already on record)
 * @param {string} [opts.hospitalName] - Branding
 * @returns {Promise<{ok:boolean, relativePath:string, absolutePath:string}>}
 */
async function buildVaccinationCertificatePDF({ record, patient, doctor, hospitalName }) {
  ensureDirs();

  const rec = record || {};
  const pat = patient || rec.patient || {};
  const docUser = doctor || rec.doctor || {};
  const hospital = hospitalName || process.env.HOSPITAL_NAME || 'Hospital';

  const fileBase = sanitizeFileName(rec.certificateNumber, rec._id);
  const fileName = `${fileBase}.pdf`;
  const relativePath = path.join('certificates', fileName);
  const absolutePath = path.join(CERT_DIR, fileName);

  const pdf = new PDFDocument({ size: 'A4', margin: 50 });

  // --- Header (logo + hospital + title + cert no) ---
  const logoPath = process.env.HOSPITAL_LOGO_PATH || path.join(UPLOADS_DIR, 'logo.png');
  let y = 50;

  if (fs.existsSync(logoPath)) {
    try { pdf.image(logoPath, 50, y, { width: 48, height: 48, fit: [48, 48] }); }
    catch { /* ignore invalid image */ }
  }

  pdf.font('Helvetica-Bold').fontSize(16).fillColor('#111').text(hospital, 110, y);
  pdf.font('Helvetica').fontSize(11).fillColor('#6b7280').text('Vaccination Certificate', 110, y + 20);

  // Right-aligned, single-line certificate number
  const certNo = rec.certificateNumber ? `Cert No: ${rec.certificateNumber}` : 'Cert No: —';
  pdf.font('Helvetica-Bold').fontSize(10).fillColor('#111').text(certNo, 360, y, { width: 180, align: 'right' });

  y += 60;
  hLine(pdf, 50, 545, y); y += 12;

  // --- Summary ---
  y = sectionTitle(pdf, 'Summary', y);

  const patientName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || '-';
  const patientId = pat.userId || pat._id || '-';
  const patientEmail = pat.email || '-';
  const patientDob = pat.dob ? fmtColomboDate(pat.dob) : '-';

  let yL = labelValue(pdf, 'Patient Name', patientName, 50, y, 110, 220);
  yL = labelValue(pdf, 'Patient ID', patientId, 50, yL + 6, 110, 220);
  yL = labelValue(pdf, 'Date of Birth', patientDob, 50, yL + 6, 110, 220);
  yL = labelValue(pdf, 'Patient Email', patientEmail, 50, yL + 6, 110, 220);

  const adminDate = rec.dateAdministered ? fmtColomboDateTime(rec.dateAdministered) : '-';
  const doctorName = `${docUser.firstName || ''} ${docUser.lastName || ''}`.trim() || '-';

  let yR = labelValue(pdf, 'Date & Time', adminDate, 320, y, 110, 200);
  yR = labelValue(pdf, 'Healthcare Provider', doctorName, 320, yR + 6, 110, 200);
  yR = labelValue(pdf, 'Facility', hospital, 320, yR + 6, 110, 200);
  yR = labelValue(pdf, 'Certificate Status', rec.voided ? 'Voided' : 'Valid', 320, yR + 6, 110, 200);

  y = Math.max(yL, yR) + 16;

  // --- Details ---
  y = sectionTitle(pdf, 'Details', y);
  y = drawDetailsTable(pdf, y, {
    vaccine: rec.vaccineName || '-',
    manufacturer: rec.manufacturer || '-',
    dose: `Dose ${rec.doseNumber || 1}`,
    batch: rec.batchLotNo || '-',
    expiry: rec.expiryDate ? fmtColomboDate(rec.expiryDate) : '',
    route: rec.route || '-',
    site: rec.site || ''
  });

  // Notes (optional)
  if (rec.notes) {
    y += 10;
    pdf.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Clinical Notes', 50, y);
    y += 14;
    pdf.font('Helvetica').fontSize(10).fillColor('#111')
       .text(String(rec.notes), 50, y, { width: 495 });
    y += pdf.heightOfString(String(rec.notes), { width: 495 }) + 6;
  }

  // --- Footer ---
  const genLine = `Generated on ${fmtColomboDateTime(new Date())} — ${hospital}`;
  pdf.font('Helvetica').fontSize(9).fillColor('#6b7280')
     .text(genLine, 50, 780, { width: 495, align: 'left' });

  // --- Watermark if voided ---
  drawVoidedWatermark(pdf, !!rec.voided);

  await writePdfToFile(pdf, absolutePath);
  return { ok: true, relativePath, absolutePath };
}

module.exports = { buildVaccinationCertificatePDF };
