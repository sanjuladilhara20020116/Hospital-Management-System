const express = require("express");
const router = express.Router();
const DiagnosisCard = require("../models/DiagnosisCard");

// use the new layout helpers
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
    const item = await DiagnosisCard.create(req.body);
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

    if (q) where.finalDiagnosis = { $regex: q, $options: "i" };
    if (doctor) {
      const rx = { $regex: doctor, $options: "i" };
      where.$or = [{ doctorName: rx }, { doctorUserId: rx }];
    }
    if (dateFrom || dateTo) {
      where.visitDateTime = {};
      if (dateFrom) where.visitDateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo)   where.visitDateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const items = await DiagnosisCard.find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch diagnosis cards" });
  }
});

/* ---------------------------- Download PDF -------------------------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await DiagnosisCard.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Diagnosis card not found" });

    const filename = `DiagnosisCard_${item.diagnosisCardId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Diagnosis Card");

    // Card Info
    subsection(doc, "Card Information");
    fieldPair(
      doc,
      "DiagnosisCard ID", item.diagnosisCardId || item._id,
      "Date & Time", new Date(item.visitDateTime).toLocaleString()
    );
    fieldPair(
      doc,
      "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`,
      "Age", item.age ?? "—"
    );
    fieldFull(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    // Diagnosis details
    subsection(doc, "Diagnosis Details");
    fieldPair(doc, "Preliminary Diagnosis", item.preliminaryDiagnosis, "Final Diagnosis", item.finalDiagnosis);
    fieldPair(doc, "Related symptoms", item.relatedSymptoms, "Cause / Risk factors", item.riskFactors);
    fieldFull(doc, "Lifestyle advice", item.lifestyleAdvice);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

/* --------------------------- Read / Update / Delete ----------------- */
router.get("/:id", async (req, res) => {
  try {
    const item = await DiagnosisCard.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Diagnosis card not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Diagnosis card not found" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await DiagnosisCard.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Diagnosis card not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update diagnosis card" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const out = await DiagnosisCard.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Diagnosis card not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete diagnosis card" });
  }
});

module.exports = router;
