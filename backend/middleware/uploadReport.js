// backend/middleware/uploadReport.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}_${base}${ext}`);
  }
});

// ✅ PDF-only (no images). Be tolerant of odd client mimetypes.
// Accept if EITHER mimetype is application/pdf OR filename ends with .pdf
const isPdfMime = (m) => String(m || '').toLowerCase() === 'application/pdf';
const isPdfName = (name) => /\.pdf$/i.test(String(name || ''));

const fileFilter = (req, file, cb) => {
  const mimeOk = isPdfMime(file.mimetype);
  const nameOk = isPdfName(file.originalname);
  if (!mimeOk && !nameOk) {
    return cb(new Error('Only PDF files are allowed'));
  }
  cb(null, true);
};

// keep size limit for PDFs (e.g., 20 MB)
const uploadReport = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = uploadReport;
