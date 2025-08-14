
// routes/inventoryRoutes.js
const express = require('express');
const Medicine = require('../models/Medicine');
const router = express.Router();

// List medicines (optionally filter by low-stock or near-expiry)
router.get('/medicines', async (req, res) => {
  try {
    const { lowStock, expiringInDays } = req.query;
    let meds = await Medicine.find();

    if (lowStock === 'true') {
      meds = meds.filter(m => m.totalQty <= (m.reorderLevel || 0));
    }

    if (expiringInDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(expiringInDays));
      meds = meds.filter(m => m.batches.some(b => b.qty > 0 && b.expiryDate <= cutoff));
    }

    res.json(meds.map(m => ({
      ...m.toObject(),
      totalQty: m.totalQty
    })));
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
});

// Create / upsert medicine (without batches)
router.post('/medicines', async (req, res) => {
  try {
    const { code, name, form, strength, reorderLevel } = req.body;
    const existing = await Medicine.findOne({ code });
    if (existing) {
      existing.name = name ?? existing.name;
      existing.form = form ?? existing.form;
      existing.strength = strength ?? existing.strength;
      if (reorderLevel !== undefined) existing.reorderLevel = reorderLevel;
      await existing.save();
      return res.json({ message: 'Medicine updated', medicine: existing });
    }
    const med = await Medicine.create({ code, name, form, strength, reorderLevel });
    res.status(201).json({ message: 'Medicine created', medicine: med });
  } catch (e) {
    res.status(400).json({ message: 'Failed to save medicine' });
  }
});

// Add stock to a medicine (add a batch)
router.post('/medicines/:code/batches', async (req, res) => {
  try {
    const { batchNo, qty, unit, expiryDate, unitPrice, supplierName } = req.body;
    const med = await Medicine.findOne({ code: req.params.code });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });

    med.batches.push({ batchNo, qty, unit, expiryDate, unitPrice, supplierName });
    await med.save();
    res.status(201).json({ message: 'Batch added', medicine: med });
  } catch (e) {
    res.status(400).json({ message: 'Failed to add batch' });
  }
});

// Edit batch (e.g., adjust qty)
router.put('/medicines/:code/batches/:batchNo', async (req, res) => {
  try {
    const med = await Medicine.findOne({ code: req.params.code });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });

    const b = med.batches.find(x => x.batchNo === req.params.batchNo);
    if (!b) return res.status(404).json({ message: 'Batch not found' });

    Object.assign(b, req.body);
    await med.save();
    res.json({ message: 'Batch updated', medicine: med });
  } catch (e) {
    res.status(400).json({ message: 'Failed to update batch' });
  }
});

// Remove a batch
router.delete('/medicines/:code/batches/:batchNo', async (req, res) => {
  try {
    const med = await Medicine.findOne({ code: req.params.code });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    med.batches = med.batches.filter(b => b.batchNo !== req.params.batchNo);
    await med.save();
    res.json({ message: 'Batch removed', medicine: med });
  } catch (e) {
    res.status(400).json({ message: 'Failed to remove batch' });
  }
});

// Low-stock & near-expiry reports
router.get('/reports/alerts', async (req, res) => {
  try {
    const days = Number(req.query.expiringInDays || 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const meds = await Medicine.find();
    const lowStock = meds.filter(m => m.totalQty <= (m.reorderLevel || 0));
    const nearExpiry = meds
      .map(m => ({
        code: m.code,
        name: m.name,
        batches: m.batches.filter(b => b.qty > 0 && b.expiryDate <= cutoff)
      }))
      .filter(x => x.batches.length);

    res.json({ lowStock, nearExpiry, expiringInDays: days });
  } catch (e) {
    res.status(500).json({ message: 'Failed to build alerts' });
  }
});

module.exports = router;
