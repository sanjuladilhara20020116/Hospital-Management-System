const express = require("express");
const router = express.Router();
const AdmissionNote = require("../models/AdmissionNote");

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
    const item = await AdmissionNote.create(req.body);
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

    if (q) where.preliminaryDiagnosis = { $regex: q, $options: "i" };
    if (doctor) {
      const rx = { $regex: doctor, $options: "i" };
      where.$or = [{ doctorName: rx }, { doctorUserId: rx }];
    }
    if (dateFrom || dateTo) {
      where.visitDateTime = {};
      if (dateFrom) where.visitDateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo)   where.visitDateTime.$lte  = new Date(`${dateTo}T23:59:59Z`);
    }

    const items = await AdmissionNote.find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch admission notes" });
  }
});

/* ---------------------------- Download PDF -------------------------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await AdmissionNote.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Admission note not found" });

    const filename = `AdmissionNote_${item.admissionNoteId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Admission Note");

    // Admission info
    subsection(doc, "Admission Information");
    fieldPair(
      doc,
      "AdmissionNote ID", item.admissionNoteId || item._id,
      "Date & Time", new Date(item.visitDateTime).toLocaleString()
    );
    fieldPair(
      doc,
      "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`,
      "Age", item.age ?? "—"
    );
    fieldFull(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    // Clinical details
    subsection(doc, "Clinical Details");
    fieldPair(doc, "Chief complaint", item.chiefComplaint, "Preliminary Diagnosis", item.preliminaryDiagnosis);
    fieldPair(doc, "Recommended ward/unit", item.recommendedUnit, "Present symptoms", item.presentSymptoms);
    fieldPair(doc, "Examination Findings", item.examinationFindings, "Existing conditions", item.existingConditions);
    fieldPair(doc, "Immediate Managements", item.immediateManagements, "Emergency Medical care", item.emergencyCare);
    fieldFull(doc, "Doctor Notes", item.doctorNotes);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

/* --------------------------- Read / Update / Delete ----------------- */
router.get("/:id", async (req, res) => {
  try {
    const item = await AdmissionNote.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Admission note not found" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await AdmissionNote.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update admission note" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const out = await AdmissionNote.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Admission note not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete admission note" });
  }
});

module.exports = router;
