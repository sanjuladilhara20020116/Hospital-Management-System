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

// allow PDF + common image types; validate both mimetype and extension
const allowed = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
]);

const fileFilter = (req, file, cb) => {
  const mimetypeOk = allowed.has(file.mimetype.toLowerCase());
  const extOk = /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname);
  if (!mimetypeOk || !extOk) {
    return cb(new Error('Only PDF, PNG, JPG, JPEG, WEBP are allowed'));
  }
  cb(null, true);
};

// increase size a bit for PDFs (e.g., 20 MB)
const uploadReport = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = uploadReport;
