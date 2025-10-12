// utils/pdf.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/** ---- Hospital constants ---- */
const HOSPITAL = {
  name: "MediCore Hospital",
  address: "No : 144, Alfred Pl, Colombo 03",
  email: "medicore@gmail.com",
  contact: "+94-64356865",
  // update this path as needed
  logoPath: path.resolve(__dirname, "..", "assets", "Hospital.png"),
};

function sanitize(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function line(doc) {
  const y = doc.y + 6;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.8);
}

/**
 * Draw image inside a circular clip.
 * - Uses "contain" fit so the whole logo is visible.
 * - `safety` insets a bit from the edge.
 * - `zoom` enlarges the logo *inside* the circle without changing circle size.
 */
function drawCircularImage(
  doc,
  imgPath,
  cx,
  cy,
  radius,
  offsetX = 0,
  offsetY = 0,
  safety = 0.94,
  zoom = 1.20
) {
  const diameter = radius * 2;

  // white base for crisp circular edge
  doc.save();
  doc.circle(cx, cy, radius).fill("#ffffff");
  doc.restore();

  if (!fs.existsSync(imgPath)) {
    // fallback: ring + text
    doc.save();
    doc.circle(cx, cy, radius).lineWidth(1.2).strokeColor("#ffffff").stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#ffffff")
      .text("LOGO", cx - radius, cy - 6, { width: diameter, align: "center" });
    doc.restore();
    return;
  }

  const img = doc.openImage(imgPath);
  const iw = img.width;
  const ih = img.height;

  // contain-fit then apply safety + zoom
  const sx = diameter / iw;
  const sy = diameter / ih;
  const scale = Math.min(sx, sy) * safety * zoom;

  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cx - dw / 2 + offsetX;
  const dy = cy - dh / 2 + offsetY;

  doc.save();
  doc.circle(cx, cy, radius).clip();
  doc.image(img, dx, dy, { width: dw, height: dh });
  doc.restore();
}

/** Draw blue rounded header: logo + name on left; info block top-right */
function drawHeader(doc) {
  const { width } = doc.page;
  const ml = doc.page.margins.left;
  const mr = doc.page.margins.right;

  const extraLeft = 12;

  const bannerX = ml - extraLeft;
  const bannerW = width - ml - mr + extraLeft * 2;
  const bannerH = 118;
  const blue = "#1565C0";

  // rounded banner
  doc.save();
  doc.roundedRect(bannerX, 24, bannerW, bannerH, 18).fill(blue);
  doc.restore();

  // --- Left: circular logo with subtle ring ---
  const cx = ml + extraLeft + 54;
  const cy = 24 + bannerH / 2 - 2;
  const r = 34; // circle size unchanged
  const ringR = r + 8;

  // outer white ring
  doc.save().circle(cx, cy, ringR).fill("#ffffff").restore();
  doc
    .save()
    .circle(cx, cy, ringR)
    .lineWidth(1)
    .strokeColor("#e6eef8")
    .stroke()
    .restore();

  // logo inside (slightly zoomed)
  drawCircularImage(doc, HOSPITAL.logoPath, cx, cy, r, 0, 0, 0.94, 1.08);

  // --- Right info block (top-right corner, right-aligned) ---
  const rightW = 250;
  const rightX = width - mr - rightW;
  const baseY = 24 + 16;
  const lh = 16;
  const info = [
    HOSPITAL.address,
    `E-mail: ${HOSPITAL.email}`,
    `Contact: ${HOSPITAL.contact}`,
  ];

  doc.save();
  doc.fillColor("#ffffff").font("Helvetica").fontSize(11);
  info.forEach((t, i) => {
    doc.text(t, rightX, baseY + i * lh, {
      width: rightW,
      align: "right",
      ellipsis: true,
    });
  });
  doc.restore();

  // --- Hospital name (auto-shrink to keep a single line; START BIGGER) ---
  const nameX = cx + ringR + 16;
  const nameMaxW = rightX - 16 - nameX;
  let fs = 28; // bigger headline
  const minFs = 16;

  doc.save();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(fs);
  while (fs > minFs && doc.widthOfString(HOSPITAL.name) > nameMaxW) {
    fs -= 1;
    doc.fontSize(fs);
  }
  doc.text(HOSPITAL.name, nameX, 36 + 16, {
    width: nameMaxW,
    align: "left",
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();

  // move cursor below banner
  doc.y = 24 + bannerH + 16;
}

/** Section title bar (centered) for the big page title */
function drawSectionTitle(doc, title) {
  if (!title) return;
  const x = doc.page.margins.left - 6;
  const w =
    doc.page.width - doc.page.margins.left - doc.page.margins.right + 12;
  const h = 46;

  doc.save();
  doc.roundedRect(x, doc.y, w, h, 8).fill("#F3F4F6");
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#1F2937")
    .text(title, x, doc.y + 11, { width: w, align: "center" });
  doc.restore();

  doc.moveDown(1.6);
}

/* -------------------- NEW: subsection + field box helpers -------------------- */

/** Left-aligned subsection header (e.g., "Record Information") */
function subsection(doc, text) {
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#1F2937")
    .text(text, doc.page.margins.left, doc.y);
  line(doc);
}

/** Draws a label + rounded light box with the value, returning the height used. */
function drawLabeledBox(doc, { x, y, w, label, value }) {
  const pad = 10;
  const boxY = y + 16; // space for label
  const innerW = w - pad * 2;

  // label
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(label, x, y, { width: w });

  // measure value and draw box
  const text = sanitize(value) || "—";
  const textColor = text === "—" ? "#9CA3AF" : "#1F2937";
  const h = doc.heightOfString(text, {
    width: innerW,
    align: "left",
  });

  const boxH = Math.max(28, h + pad * 2);

  doc.save();
  doc
    .roundedRect(x, boxY, w, boxH, 8)
    .fill("#F8FAFC"); // light background
  doc.restore();

  doc
    .fillColor(textColor)
    .font("Helvetica")
    .fontSize(11)
    .text(text, x + pad, boxY + pad, { width: innerW });

  return boxY + boxH - y; // total height consumed from start y
}

/** Two-column row of labeled boxes */
function fieldPair(doc, l1, v1, l2, v2) {
  const gap = 26;
  const total =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colW = (total - gap) / 2;
  const x1 = doc.page.margins.left;
  const x2 = x1 + colW + gap;
  const y0 = doc.y;

  const h1 = drawLabeledBox(doc, { x: x1, y: y0, w: colW, label: l1, value: v1 });
  const h2 = drawLabeledBox(doc, { x: x2, y: y0, w: colW, label: l2, value: v2 });

  const rowH = Math.max(h1, h2);
  doc.y = y0 + rowH + 14; // row spacing
}

/** Full-width labeled box */
function fieldFull(doc, label, value) {
  const total =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x = doc.page.margins.left;
  const y0 = doc.y;

  const used = drawLabeledBox(doc, { x, y: y0, w: total, label, value });
  doc.y = y0 + used + 14;
}

/** ---- Public API used by your routes ---- */
function startDoc(res, filename, title) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 48, left: 56, right: 56, bottom: 56 },
  });

  doc.pipe(res);
  drawHeader(doc);
  drawSectionTitle(doc, title);
  return doc;
}

function addField(doc, label, value) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(label);
  doc.moveDown(0.2);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(value), { paragraphGap: 8 });
  doc.moveDown(0.4);
}

function finishDoc(doc) {
  doc.end();
}

/** Grid helpers (kept for meta blocks) */
function addMetaRow2(doc, l1, v1, l2, v2) {
  const gap = 28;
  const total =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const half = (total - gap) / 2;
  const x1 = doc.page.margins.left;
  const x2 = x1 + half + gap;
  const y0 = doc.y;

  doc.save();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(l1, x1, y0, { width: half });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(v1), x1, doc.y, { width: half });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(l2, x2, y0, { width: half });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(v2), x2, doc.y, { width: half });
  doc.restore();

  doc.moveDown(0.8);
}

function addMetaRow3(doc, l1, v1, l2, v2, l3, v3) {
  const gap = 22;
  const total =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colW = (total - gap * 2) / 3;
  const x1 = doc.page.margins.left;
  const x2 = x1 + colW + gap;
  const x3 = x2 + colW + gap;
  const y0 = doc.y;

  doc.save();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(l1, x1, y0, { width: colW });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(v1), x1, doc.y, { width: colW });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(l2, x2, y0, { width: colW });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(v2), x2, doc.y, { width: colW });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(l3, x3, y0, { width: colW });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F2937")
    .text(sanitize(v3), x3, doc.y, { width: colW });
  doc.restore();

  doc.moveDown(0.8);
}

module.exports = {
  startDoc,
  addField,
  finishDoc,
  line,
  addMetaRow2,
  addMetaRow3,

  // new helpers (used by clinicalRecordRoutes)
  subsection,
  fieldPair,
  fieldFull,
};
