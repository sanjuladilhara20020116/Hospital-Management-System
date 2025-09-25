
 // routes/availabilityRoutes.js
const r = require('express').Router();

const {
  upsertDay,
  listMine,
  weekView,
} = require('../controllers/availabilityController');

// ✅ Import ONCE (no duplicates)
const { protect, allowRoles } = require('../controllers/userController');

// Doctor: create/update a day's availability
r.post('/doctor/day', protect, allowRoles('Doctor'), upsertDay);

// Doctor: list my availability days
r.get('/doctor/days', protect, allowRoles('Doctor'), listMine);

// Patient/public: view a doctor's week (slots & counts)
r.get('/patient/:doctorId/week', weekView);

module.exports = r;
