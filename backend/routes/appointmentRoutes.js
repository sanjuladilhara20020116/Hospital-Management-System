
const express = require('express');
const router = express.Router();

const { create, listForPatient, listForDoctor, reschedule, changeStatus,
        getSlots, getSessions, getAvailability, setAvailability, editAppointment, deleteAppointment, getSlotDuration, getDoctorAppointments } =
  require('../controllers/appointmentController');
// DELETE: Delete a specific appointment by id (Patient)

const actorPatient = require('../middleware/actorPatient');
const actorDoctor  = require('../middleware/actorDoctor');
const { sendConfirmationEmail } = require('../controllers/emailController');

const { createRules, rescheduleRules, statusRules, slotsRules } = require('../middleware/validators/appointments');
const { validate } = require('../middleware/validators');

// PATCH: Edit appointment (reschedule time only)
// POST: Send appointment confirmation email
router.post('/send-confirmation-email', sendConfirmationEmail);
router.patch('/:id/edit', editAppointment);
router.delete('/:id/delete', deleteAppointment);
// GET: Slot duration for a doctor on a given date (doctorId as query param to support slashes)
router.get('/doctors/slots', getSlotDuration);
// -------- Discovery / Slots / Sessions (public-safe) --------
router.get('/doctors/:doctorId/sessions', slotsRules, validate, getSessions);
router.get('/doctors/:doctorId/slots',    slotsRules, validate, getSlots);

// -------- Patient booking & lists --------
router.post('/', actorPatient, createRules, validate, create);
router.get('/patients', listForPatient);
router.patch('/:id/reschedule', actorPatient, rescheduleRules, validate, reschedule);

// -------- Doctor lists & status updates --------
router.get('/doctors/:doctorId', listForDoctor);
router.get('/getUserAppointments', getDoctorAppointments);
router.patch('/:id/status', actorDoctor, statusRules, validate, changeStatus);

// -------- Doctor availability --------
router.get('/availability/me', actorDoctor, getAvailability);
router.put('/availability/me', actorDoctor, setAvailability);

module.exports = router;
