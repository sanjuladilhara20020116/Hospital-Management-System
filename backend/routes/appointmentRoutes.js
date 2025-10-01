// routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();

const {
  createIntent,  // NEW
  pay,           // NEW
  listForPatient, listForDoctor, reschedule, changeStatus,
  getSlots, getSessions, getAvailability, setAvailability
} = require('../controllers/appointmentController');

const actorPatient = require('../middleware/actorPatient'); // keep if you already use it
const actorDoctor  = require('../middleware/actorDoctor');

const { createRules, rescheduleRules, statusRules, slotsRules } =
  require('../middleware/validators/appointments');
const { validate } = require('../middleware/validators');

// Public discovery
router.get('/doctors/:doctorId/sessions', slotsRules, validate, getSessions);
router.get('/doctors/:doctorId/slots',    slotsRules, validate, getSlots);

// Patient flow
router.post('/intent', /*actorPatient,*/ createRules, validate, createIntent);
router.post('/:id/pay', pay); // mock payment confirm
router.get('/patients/:patientId', listForPatient);
router.patch('/:id/reschedule', /*actorPatient,*/ rescheduleRules, validate, reschedule);

// Doctor
router.get('/doctors/:doctorId', listForDoctor);
router.patch('/:id/status', /*actorDoctor,*/ statusRules, validate, changeStatus);

// Doctor availability
router.get('/availability/me', /*actorDoctor,*/ getAvailability);
router.put('/availability/me', /*actorDoctor,*/ setAvailability);

module.exports = router;
