// routes/prescriptionRoutes.js
const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");

const {
  startDoc,
  finishDoc,
  subsection,
  fieldPair,
  fieldFull,
} = require("../utils/pdf");

// dedicated mailer (won't collide with teammates' mailer)
const { sendMail, SKIP } = require("../utils/prescriptionMailer");

// Try to load patient email from Users collection if available
let UserModel = null;
try {
  UserModel = require("../models/User");
} catch (_) { /* optional */ }

// ---- Extra imports ONLY for building the email-PDF header ----
const fs = require("fs");
const PDFDocument = require("pdfkit");
// If you have backend/config/hospital.js use it; else fall back to sane defaults
let hospital = {
  name: "MediCore Hospital",
  address: "No : 144, Alfred Pl, Colombo 03",
  email: "medicore@gmail.com",
  contact: "+94-64356865",
  logoPath: require("path").resolve(__dirname, "..", "assets", "Hospital.png"),
};
try {
  // prefer your central hospital config if present
  hospital = require("../config/hospital");
} catch (_) { /* optional */ }

/* -------------------------- Header helpers (mail) -------------------------- */
function drawCircularImage(doc, imgPath, cx, cy, radius, offsetX = 0, offsetY = 0, safety = 0.94, zoom = 1.08) {
  const diameter = radius * 2;
  // white base for crisp edge
  doc.save().circle(cx, cy, radius).fill("#ffffff").restore();

  if (!imgPath || !fs.existsSync(imgPath)) {
    // fallback ring + label
    doc.save();
    doc.circle(cx, cy, radius).lineWidth(1).strokeColor("#ffffff").stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
      .text("LOGO", cx - radius, cy - 6, { width: diameter, align: "center" });
    doc.restore();
    return;
  }

  const img = doc.openImage(imgPath);
  const iw = img.width, ih = img.height;
  const sx = diameter / iw, sy = diameter / ih;
  const scale = Math.min(sx, sy) * safety * zoom;
  const dw = iw * scale, dh = ih * scale;
  const dx = cx - dw / 2 + offsetX;
  const dy = cy - dh / 2 + offsetY;

  doc.save(); doc.circle(cx, cy, radius).clip();
  doc.image(img, dx, dy, { width: dw, height: dh });
  doc.restore();
}

function drawMailHeader(doc, titleText) {
  const pageW = doc.page.width;
  const ml = doc.page.margins.left;
  const mr = doc.page.margins.right;

  const blue = "#1565C0";
  const bannerY = 24;
  const bannerH = 118;
  const extraLeft = 12;
  const bannerX = ml - extraLeft;
  const bannerW = pageW - ml - mr + extraLeft * 2;

  // rounded blue banner
  doc.save();
  doc.roundedRect(bannerX, bannerY, bannerW, bannerH, 18).fill(blue);
  doc.restore();

  // Logo (left)
  const cx = ml + extraLeft + 54;
  const cy = bannerY + bannerH / 2 - 2;
  const r = 34;
  const ringR = r + 8;

  doc.save().circle(cx, cy, ringR).fill("#ffffff").restore();
  doc.save().circle(cx, cy, ringR).lineWidth(1).strokeColor("#e6eef8").stroke().restore();
  drawCircularImage(doc, hospital.logoPath, cx, cy, r, 0, 0, 0.94, 1.08);

  // Right contact block
  const rightW = 250;
  const rightX = pageW - mr - rightW;
  const baseY = bannerY + 16;
  const lh = 16;
  const info = [hospital.address, `E-mail: ${hospital.email}`, `Contact: ${hospital.contact}`].filter(Boolean);

  doc.save();
  doc.fillColor("#ffffff").font("Helvetica").fontSize(11);
  info.forEach((t, i) => {
    doc.text(String(t), rightX, baseY + i * lh, { width: rightW, align: "right", ellipsis: true });
  });
  doc.restore();

  // Hospital name (auto-shrink, right of logo)
  const nameX = cx + ringR + 16;
  const nameMaxW = rightX - 16 - nameX;
  let fs = 28, minFs = 16;

  doc.save().fillColor("#ffffff").font("Helvetica-Bold").fontSize(fs);
  while (fs > minFs && doc.widthOfString(hospital.name) > nameMaxW) {
    fs -= 1; doc.fontSize(fs);
  }
  doc.text(hospital.name || "Hospital", nameX, bannerY + 16, {
    width: nameMaxW, align: "left", lineBreak: false, ellipsis: true,
  });
  doc.restore();

  // Section title bar (centered)
  if (titleText) {
    const x = ml - 6, w = pageW - ml - mr + 12, h = 46;
    doc.save();
    doc.roundedRect(x, bannerY + bannerH + 16, w, h, 8).fill("#F3F4F6");
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#1F2937")
      .text(titleText, x, bannerY + bannerH + 16 + 11, { width: w, align: "center" });
    doc.restore();
    doc.y = bannerY + bannerH + 16 + h + 16;
  } else {
    doc.y = bannerY + bannerH + 16;
  }
}

/* ------------------------ build email PDF (buffer) ------------------------- */
function buildPrescriptionPdfBuffer(item) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, left: 56, right: 56, bottom: 56 },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // full styled header, same look as streamed PDFs
    drawMailHeader(doc, "Prescription");

    // ---- same structure as /:id/pdf below ----
    subsection(doc, "Prescription Information");
    fieldPair(
      doc,
      "Prescription ID", item.prescriptionId || item._id,
      "Date & Time", new Date(item.visitDateTime).toLocaleString()
    );
    fieldPair(
      doc,
      "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`,
      "Age", item.age ?? "—"
    );
    fieldFull(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    subsection(doc, "Medication Details");
    fieldFull(doc, "Chief complaint", item.chiefComplaint);
    fieldFull(doc, "Medicine Name and dosage", item.medicines);
    fieldPair(doc, "Instructions", item.instructions, "Duration", item.duration);
    fieldFull(doc, "Requested lab reports", item.requestedLabReports);

    finishDoc(doc);
  });
}

/* ------------------------- email utilities ------------------------- */
async function lookupPatientEmail(patientUserId, fallbackEmail) {
  if (fallbackEmail) return fallbackEmail;
  if (!UserModel) return null;

  // try by userId then by _id
  const user =
    (await UserModel.findOne({ userId: patientUserId }, "email").lean()) ||
    (await UserModel.findById(patientUserId, "email").lean());

  return user?.email || null;
}

async function emailPrescriptionPdf(item) {
  try {
    if (SKIP) return { skipped: true };

    const to = await lookupPatientEmail(item.patientUserId, item.patientEmail);
    if (!to) {
      console.warn("Prescription email skipped: no patient email.");
      return { skipped: true, reason: "no-recipient" };
    }

    const pdfBuffer = await buildPrescriptionPdfBuffer(item);
    const filename = `Prescription_${item.prescriptionId || item._id}.pdf`;

    const subject = `Your Prescription ${item.prescriptionId || ""}`.trim();
    const text =
      `Hello ${item.patientName || "Patient"},\n\n` +
      `Please find attached your prescription${item.visitDateTime ? ` dated ${new Date(item.visitDateTime).toLocaleString()}` : ""}.\n\n` +
      `— ${item.doctorName || "Your Doctor"}`;

    await sendMail({
      to,
      subject,
      text,
      attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
    });

    return { sent: true };
  } catch (err) {
    console.error("Failed sending prescription email:", err.message);
    return { sent: false, error: err.message };
  }
}

/* ------------------------------ Create ------------------------------ */
router.post("/", async (req, res) => {
  try {
    const item = await Prescription.create(req.body);
    // Fire-and-forget (safe)
    emailPrescriptionPdf(item).catch(() => {});
    return res.status(201).json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

/* -------- List by patient (filters) — most-recent first -------- */
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const { q, doctor, dateFrom, dateTo } = req.query;
    const where = { patientUserId: req.params.patientUserId };

    if (q) where.chiefComplaint = { $regex: q, $options: "i" };
    if (doctor) {
      const rx = { $regex: doctor, $options: "i" };
      where.$or = [{ doctorName: rx }, { doctorUserId: rx }];
    }
    if (dateFrom || dateTo) {
      where.visitDateTime = {};
      if (dateFrom) where.visitDateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo) where.visitDateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const items = await Prescription.find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
});

/* ---------------------------- Download PDF -------------------------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await Prescription.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Prescription not found" });

    const filename = `Prescription_${item.prescriptionId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Prescription");

    // Prescription info
    subsection(doc, "Prescription Information");
    fieldPair(
      doc,
      "Prescription ID", item.prescriptionId || item._id,
      "Date & Time", new Date(item.visitDateTime).toLocaleString()
    );
    fieldPair(
      doc,
      "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`,
      "Age", item.age ?? "—"
    );
    fieldFull(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    // Medication details
    subsection(doc, "Medication Details");
    fieldFull(doc, "Chief complaint", item.chiefComplaint);
    fieldFull(doc, "Medicine Name and dosage", item.medicines);
    fieldPair(doc, "Instructions", item.instructions, "Duration", item.duration);
    fieldFull(doc, "Requested lab reports", item.requestedLabReports);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

/* --------------------------- Read / Update / Delete ----------------- */
router.get("/:id", async (req, res) => {
  try {
    const item = await Prescription.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Prescription not found" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await Prescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Prescription not found" });

    // email updated prescription PDF (safe)
    emailPrescriptionPdf(item).catch(() => {});
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update prescription" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const out = await Prescription.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete prescription" });
  }
});

module.exports = router;
