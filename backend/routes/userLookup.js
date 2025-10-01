const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { actorFromHeader, allowRolesNoJWT } = require('../middleware/actor');

router.use(actorFromHeader);

// GET /api/user-lookup?userId=... | ?nic=...
router.get('/', allowRolesNoJWT('Doctor'), async (req, res) => {
  try {
    const { userId, nic } = req.query;
    if (!userId && !nic) {
      return res.status(400).json({ message: 'Provide userId or nic' });
    }

    const q = { role: 'Patient' };
    if (userId) q.userId = userId.trim();
    if (nic) q.nicNumber = nic.trim();

    const p = await User.findOne(q).lean();
    if (!p) return res.status(404).json({ message: 'Patient not found' });

    // age
    let age = null;
    if (p.dateOfBirth) {
      const dob = new Date(p.dateOfBirth);
      const now = new Date();
      age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    }

    const allergies = Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : []);
    const medicalHistory =
      Array.isArray(p.medicalHistory) ? p.medicalHistory :
      (p.medicalHistory ? [p.medicalHistory] :
      (p.medicalHistoryNotes ? [p.medicalHistoryNotes] : []));

    return res.json({
      userId: p.userId,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      nicNumber: p.nicNumber || '',
      gender: p.gender || '',
      dateOfBirth: p.dateOfBirth || null,
      age,
      email: p.email || '',
      contactNumber: p.contactNumber || p.phone || '',
      address: p.address || '',
      allergies,
      medicalHistory,
    });
  } catch (e) {
    console.error('user-lookup error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
