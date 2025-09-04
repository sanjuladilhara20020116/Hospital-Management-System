// routes/diagnosisCardRoutes.js
const express = require("express");
const router = express.Router();
const DiagnosisCard = require("../models/DiagnosisCard");

// Create
router.post("/", async (req, res) => {
  try {
    const item = await DiagnosisCard.create(req.body);
    return res.status(201).json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

// List by patient
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const items = await DiagnosisCard
      .find({ patientUserId: req.params.patientUserId })
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch diagnosis cards" });
  }
});

// Read by _id
router.get("/:id", async (req, res) => {
  try {
    const item = await DiagnosisCard.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Diagnosis card not found" });
    return res.json({ item });
  } catch {
    return res.status(404).json({ message: "Diagnosis card not found" });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const item = await DiagnosisCard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Diagnosis card not found" });
    return res.json({ item });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Unable to update diagnosis card" });
  }
});

// Delete
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
