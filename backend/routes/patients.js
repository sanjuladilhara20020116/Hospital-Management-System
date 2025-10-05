// routes/patients.js
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();
const isObjectId = (s) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);

/**
 * GET /api/patients/:id/mini
 * - :id can be Mongo _id or userId (e.g. P000123)
 * - returns minimal fields the Trends PDF needs
 */
router.get('/:id/mini', async (req, res) => {
  try {
    const { id } = req.params;

    const query = isObjectId(id)
      ? { _id: new mongoose.Types.ObjectId(id), role: 'Patient' }
      : { userId: id, role: 'Patient' };

    const p = await User.findOne(query, {
      firstName: 1,
      lastName: 1,
      userId: 1,
      email: 1,
      gender: 1,
      age: 1,
      contactNumber: 1,
      address: 1,
      photo: 1,
    }).lean();

    if (!p) return res.status(404).json({ ok: false, message: 'Patient not found' });

    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.userId || '';
    const pid  = p.userId || String(p._id);

    res.json({
      ok: true,
      patient: {
        name,
        pid,
        age: p.age ?? null,
        gender: p.gender ?? null,
        phone: p.contactNumber ?? null,
        email: p.email ?? null,
        address: p.address ?? null,
        photo: p.photo ?? null,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
