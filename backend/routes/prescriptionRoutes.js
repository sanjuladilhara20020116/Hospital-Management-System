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

/* ------------------------------ Create ------------------------------ */
router.post("/", async (req, res) => {
  try {
    const item = await Prescription.create(req.body);
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
      if (dateTo)   where.visitDateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
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
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Prescription not found" });
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
