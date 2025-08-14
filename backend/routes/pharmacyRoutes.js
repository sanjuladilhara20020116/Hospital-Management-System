
// routes/pharmacyRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const router = express.Router();

// Dispense a prescription: decrements inventory from earliest-expiring batches
router.post('/prescriptions/:id/dispense', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const pres = await Prescription.findById(req.params.id).session(session);
    if (!pres) return res.status(404).json({ message: 'Prescription not found' });
    if (pres.status === 'DISPENSED') return res.status(400).json({ message: 'Already dispensed' });

    // For each item, decrement stock from batches sorted by expiryDate ASC
    for (const it of pres.items) {
      let needed = it.qty;
      const med = await Medicine.findOne({ code: it.medicineCode }).session(session);
      if (!med) throw new Error(`Medicine ${it.medicineCode} not found`);
      const batches = med.batches
        .filter(b => b.qty > 0 && b.expiryDate > new Date()) // avoid expired
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

      for (const b of batches) {
        if (needed <= 0) break;
        const take = Math.min(b.qty, needed);
        b.qty -= take;
        needed -= take;
      }

      if (needed > 0) {
        throw new Error(`Insufficient stock for ${it.medicineCode}. Short by ${needed}`);
      }

      await med.save({ session });
    }

    pres.status = 'DISPENSED';
    pres.dispensedAt = new Date();
    await pres.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Prescription dispensed', prescription: pres });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message || 'Dispense failed' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
