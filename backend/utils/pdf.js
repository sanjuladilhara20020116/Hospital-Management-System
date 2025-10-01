// utils/pdf.js
const PDFDocument = require("pdfkit");

function sanitize(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function line(doc) {
  const y = doc.y + 6;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#CCCCCC")
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.6);
}

function addField(doc, label, value) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111").text(label);
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(11).fillColor("#222222").text(sanitize(value), {
    paragraphGap: 8,
  });
  doc.moveDown(0.3);
}

function startDoc(res, filename, title) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 48 });
  doc.pipe(res);

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0A66C2")
    .text(title);
  doc.moveDown(0.2);
  line(doc);

  return doc;
}

function finishDoc(doc) {
  doc.end();
}

module.exports = {
  startDoc,
  addField,
  finishDoc,
  line,
};
