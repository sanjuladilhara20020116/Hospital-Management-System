// routes/prescriptionRoutes.js
const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");
const { startDoc, addField, finishDoc, line } = require("../utils/pdf");

// Create
router.post("/", async (req, res) => {
  try {
    const item = await Prescription.create(req.body);
    return res.status(201).json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

// List by patient
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const items = await Prescription
      .find({ patientUserId: req.params.patientUserId })
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
});

// Read by _id
router.get("/:id", async (req, res) => {
  try {
    const item = await Prescription.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Prescription not found" });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const item = await Prescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update prescription" });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const out = await Prescription.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: "Unable to delete prescription" });
  }
});

// ⬇️ NEW: Download PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const item = await Prescription.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Prescription not found" });

    const filename = `Prescription_${item.prescriptionId || item._id}.pdf`;
    const doc = startDoc(res, filename, "Prescription");

    // Meta
    addField(doc, "Prescription ID", item.prescriptionId || item._id);
    addField(doc, "Date & Time", new Date(item.visitDateTime).toLocaleString());
    addField(doc, "Patient", `${item.patientName || ""} (${item.patientUserId || ""})`);
    addField(doc, "Age", item.age);
    addField(doc, "Doctor", `${item.doctorName || ""} (${item.doctorUserId || ""})`);

    line(doc);

    // Clinical
    addField(doc, "Chief complaint", item.chiefComplaint);
    addField(doc, "Medicine Name and dosage", item.medicines);
    addField(doc, "Instructions", item.instructions);
    addField(doc, "Duration", item.duration);
    addField(doc, "Requested lab reports", item.requestedLabReports);

    finishDoc(doc);
  } catch (e) {
    res.status(500).json({ message: "Unable to generate PDF" });
  }
});

module.exports = router;
