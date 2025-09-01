// routes/clinicalRecordRoutes.js
const express = require("express");
const router = express.Router();
const ClinicalRecord = require("../models/ClinicalRecord");

// Create
router.post("/", async (req, res) => {
  try {
    const rec = await ClinicalRecord.create(req.body);
    return res.status(201).json({ item: rec });
  } catch (e) {
    return res.status(400).json({ message: e.message || "Validation error" });
  }
});

// List by patient (most-recent first)
router.get("/patient/:patientUserId", async (req, res) => {
  try {
    const items = await ClinicalRecord
      .find({ patientUserId: req.params.patientUserId })
      .sort({ visitDateTime: -1, createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch records" });
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
