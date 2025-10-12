// routes/clinicalRecordRoutes.js
const express = require("express");
const router = express.Router();
const ClinicalRecord = require("../models/ClinicalRecord");

// Pull PDF helpers (keep existing ones; use new ones for the layout)
const {
  startDoc,
  finishDoc,
  subsection,
  fieldPair,
  fieldFull,
} = require("../utils/pdf");

/* ------------------------------ Create ------------------------------ */
router.post("/", async (req, res) => {
  try {
    const rec = await ClinicalRecord.create(req.body);
    return res.status(201).json({ item: rec });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

/* -------- List by patient (filters supported) — most recent first --- */
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const { q, doctor, dateFrom, dateTo } = req.query;
    const where = { patientUserId: req.params.patientUserId };

    if (q) where.chiefComplaint = { $regex: q, $options: "i" };

    if (doctor) {
      const rx = { $regex: doctor, $options: "i" };
      // match either doctorName or doctorUserId
      where.$or = [{ doctorName: rx }, { doctorUserId: rx }];
    }

    if (dateFrom || dateTo) {
      where.visitDateTime = {};
      if (dateFrom) where.visitDateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo) where.visitDateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const items = await ClinicalRecord.find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch records" });
  }
});

/* ---------------------------- Download PDF -------------------------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await ClinicalRecord.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Record not found" });

    const filename = `Record_${item.recordId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Clinical Record");

    /* ------- Record Information (two-column grid + one full) ------- */
    subsection(doc, "Record Information");
    fieldPair(
      doc,
      "Record ID",
      item.recordId || item._id,
      "Date & Time",
      new Date(item.visitDateTime).toLocaleString()
    );
    fieldPair(
      doc,
      "Patient",
      `${item.patientName || ""} (${item.patientUserId || ""})`,
      "Age / Gender",
      [item.age, item.gender].filter(Boolean).join(" / ")
    );
    fieldFull(
      doc,
      "Doctor",
      `${item.doctorName || ""} (${item.doctorUserId || ""})`
    );

    /* ---------------------- Clinical Details ----------------------- */
    subsection(doc, "Clinical Details");
    fieldPair(
      doc,
      "Chief complaint / reason for visit",
      item.chiefComplaint,
      "Present symptoms",
      item.presentSymptoms
    );
    fieldPair(
      doc,
      "Examination / Observation",
      item.examination,
      "Assessment / Impression",
      item.assessment
    );
    fieldPair(
      doc,
      "Instructions",
      item.instructions,
      "Vital signs",
      item.vitalSigns
    );
    fieldFull(doc, "Doctor notes", item.doctorNotes);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

/* --------------------------- Read / Update / Delete ----------------- */
router.get("/:id", async (req, res) => {
  try {
    const item = await ClinicalRecord.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Record not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(404).json({ message: "Record not found" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await ClinicalRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Record not found" });
    return res.json({ item });
  } catch (e) {
    return res
      .status(400)
      .json({ message: e.message || "Unable to update record" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const out = await ClinicalRecord.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Record not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete record" });
  }
});

module.exports = router;
