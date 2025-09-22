// routes/clinicalRecordRoutes.js
const express = require("express");
const router = express.Router();
const ClinicalRecord = require("../models/ClinicalRecord");
const { startDoc, addField, finishDoc, line } = require("../utils/pdf");

// Create
router.post("/", async (req, res) => {
  try {
    const rec = await ClinicalRecord.create(req.body);
    return res.status(201).json({ item: rec });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

// List by patient (supports optional filters) — most recent first
// GET /api/clinical-records/patient/:patientUserId?q=&doctor=&dateFrom=&dateTo=
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
      if (dateTo)   where.visitDateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const items = await ClinicalRecord
      .find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch records" });
  }
});

// (Optionally place this before /:id if you prefer specificity first)
// Download PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await ClinicalRecord.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Record not found" });

    const filename = `Record_${item.recordId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Clinical Record");

    // Meta
    addField(doc, "Record ID", item.recordId || item._id);
    addField(doc, "Date & Time", new Date(item.visitDateTime).toLocaleString());
    addField(doc, "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`);
    addField(doc, "Age / Gender", [item.age, item.gender].filter(Boolean).join(" / "));
    addField(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    line(doc);

    // Clinical
    addField(doc, "Chief complaint / reason for visit", item.chiefComplaint);
    addField(doc, "Present symptoms", item.presentSymptoms);
    addField(doc, "Examination / Observation", item.examination);
    addField(doc, "Assessment / Impression", item.assessment);
    addField(doc, "Instructions", item.instructions);
    addField(doc, "Vital signs", item.vitalSigns);
    addField(doc, "Doctor notes", item.doctorNotes);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

// Read by Mongo _id
router.get("/:id", async (req, res) => {
  try {
    const item = await ClinicalRecord.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Record not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(404).json({ message: "Record not found" });
  }
});

// Update
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
    return res.status(400).json({ message: e.message || "Unable to update record" });
  }
});

// Delete
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
