const express = require('express');
const router = express.Router();

const { create, listForPatient, listForDoctor, reschedule, changeStatus,
        getSlots, getSessions, getAvailability, setAvailability } =
  require('../controllers/appointmentController');

const actorPatient = require('../middleware/actorPatient');
const actorDoctor  = require('../middleware/actorDoctor');

const { createRules, rescheduleRules, statusRules, slotsRules } = require('../middleware/validators/appointments');
const { validate } = require('../middleware/validators');

// -------- Discovery / Slots / Sessions (public-safe) --------
router.get('/doctors/:doctorId/sessions', slotsRules, validate, getSessions);
router.get('/doctors/:doctorId/slots',    slotsRules, validate, getSlots);

// -------- Patient booking & lists --------
router.post('/', actorPatient, createRules, validate, create);
router.get('/patients/:patientId', listForPatient);
router.patch('/:id/reschedule', actorPatient, rescheduleRules, validate, reschedule);

// -------- Doctor lists & status updates --------
router.get('/doctors/:doctorId', listForDoctor);
router.patch('/:id/status', actorDoctor, statusRules, validate, changeStatus);

// -------- Doctor availability --------
router.get('/availability/me', actorDoctor, getAvailability);
router.put('/availability/me', actorDoctor, setAvailability);

module.exports = router;
