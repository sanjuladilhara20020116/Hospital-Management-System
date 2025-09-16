// routes/admissionNoteRoutes.js
const express = require("express");
const router = express.Router();
const AdmissionNote = require("../models/AdmissionNote");
const { startDoc, addField, finishDoc, line } = require("../utils/pdf");

// Create
router.post("/", async (req, res) => {
  try {
    const item = await AdmissionNote.create(req.body);
    return res.status(201).json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

// List by patient
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const items = await AdmissionNote
      .find({ patientUserId: req.params.patientUserId })
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch admission notes" });
  }
});

// Read by _id
router.get("/:id", async (req, res) => {
  try {
    const item = await AdmissionNote.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Admission note not found" });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const item = await AdmissionNote.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update admission note" });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const out = await AdmissionNote.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete admission note" });
  }
});

// ⬇️ NEW: Download PDF
router.get("/:id/pdf", async (req, res) => {
    try {
      const item = await AdmissionNote.findById(req.params.id).lean();
      if (!item) return res.status(404).json({ message: "Admission note not found" });
  
      const filename = `AdmissionNote_${item.admissionNoteId || item._id}.pdf`;
      const doc = startDoc(res, filename, "Admission Note");
  
      // Meta
      addField(doc, "AdmissionNote ID", item.admissionNoteId || item._id);
      addField(doc, "Date & Time", new Date(item.visitDateTime).toLocaleString());
      addField(doc, "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`);
      addField(doc, "Age", item.age);
      addField(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);
  
      line(doc);
  
      // Clinical
      addField(doc, "Chife complaint", item.chiefComplaint);
      addField(doc, "Preliminary Diagnosis", item.preliminaryDiagnosis);
      addField(doc, "Recommended ward/unit", item.recommendedUnit);
      addField(doc, "Present symptoms", item.presentSymptoms);
      addField(doc, "Examination Findings", item.examinationFindings);
      addField(doc, "Existing conditions", item.existingConditions);
      addField(doc, "Immediat Managements", item.immediateManagements);
      addField(doc, "Emergency Medical care", item.emergencyCare);
      addField(doc, "Doctor Notes", item.doctorNotes);
  
      finishDoc(doc);
    } catch (e) {
      res.status(500).json({ message: "Unable to generate PDF" });
    }
  });

module.exports = router;
