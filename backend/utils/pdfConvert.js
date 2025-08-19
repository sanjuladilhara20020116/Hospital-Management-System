const path = require('path');
const fs = require('fs');
const pdfPoppler = require('pdf-poppler');

/**
 * Convert the first page of a PDF to PNG and return the PNG path.
 * Output: backend/uploads/derived/<basename>-1.png
 */
exports.convertFirstPageToPng = async function convertFirstPageToPng(pdfPathAbs) {
  if (!fs.existsSync(pdfPathAbs)) {
    throw new Error(`PDF not found: ${pdfPathAbs}`);
  }

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const derivedDir = path.join(uploadsDir, 'derived');
  if (!fs.existsSync(derivedDir)) fs.mkdirSync(derivedDir, { recursive: true });

  const base = path.basename(pdfPathAbs, path.extname(pdfPathAbs)); // no ext
  const opts = {
    format: 'png',
    out_dir: derivedDir,
    out_prefix: base,
    page: 1,     // first page
    scale: 150,  // bump to 200–300 for sharper OCR
  };

  await pdfPoppler.convert(pdfPathAbs, opts);

  const pngPath = path.join(derivedDir, `${base}-1.png`);
  if (!fs.existsSync(pngPath)) {
    throw new Error(`PDF→PNG failed. Expected: ${pngPath}`);
  }
  return pngPath;
};
