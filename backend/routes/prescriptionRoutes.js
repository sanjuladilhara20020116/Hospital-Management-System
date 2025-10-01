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

// List by patient (supports optional filters) — most-recent first
// GET /api/prescriptions/patient/:patientUserId?q=&doctor=&dateFrom=&dateTo=
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

    const items = await Prescription
      .find(where)
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
});

// (Optionally place this before /:id for specificity)
// Download PDF
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

module.exports = router;
