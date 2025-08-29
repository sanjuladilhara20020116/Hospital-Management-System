

const { body, param, query } = require('express-validator');

const rx = {
  name: /^[A-Za-z ]{2,50}$/,                  // letters + spaces only
  doctorSearch: /^[A-Za-z ]{0,20}$/,          // 0..20 chars (for search input)
  sriNicNew: /^[0-9]{12}$/,                   // 12 digits
  sriNicOld: /^[0-9]{9}[VvXx]$/,              // 9 digits + V/v/X/x
  passport: /^[A-Za-z0-9]{6,12}$/,            // 6..12 alnum
  phone: /^[0-9]{9,12}$/,                     // local digits (after country code)
  idFmt: /^[A-Z]\d{4}\/\d{1,4}\/\d{1,4}$/,    // P2025/200/123 or D2025/100/007
  reason: /^[A-Za-z0-9 ,.]{0,200}$/,          // safe punctuation only
  hhmm: /^([01]\d|2[0-3]):([0-5]\d)$/,        // 00:00..23:59
  ymd: /^\d{4}-\d{2}-\d{2}$/,                 // 2025-07-28
};

const createRules = [
  body('patientId').matches(rx.idFmt).withMessage('Invalid patientId format'),
  body('doctorId').matches(rx.idFmt).withMessage('Invalid doctorId format'),
  body('date').matches(rx.ymd).withMessage('Invalid date (YYYY-MM-DD)'),
  body('startTime').matches(rx.hhmm).withMessage('Invalid startTime (HH:mm)'),
  body('name').matches(rx.name).withMessage('Name must be letters & spaces only'),
  body('phone').matches(rx.phone).withMessage('Phone invalid (digits 9-12)'),
  body('nic').optional({ nullable: true }).custom((v, { req }) => {
    if (!v && !req.body.passport) throw new Error('NIC or Passport required');
    if (v && !(rx.sriNicNew.test(v) || rx.sriNicOld.test(v))) throw new Error('Invalid NIC');
    return true;
  }),
  body('passport').optional({ nullable: true }).custom((v, { req }) => {
    if (!v && !req.body.nic) throw new Error('NIC or Passport required');
    if (v && !rx.passport.test(v)) throw new Error('Invalid Passport');
    return true;
  }),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('reason').optional().matches(rx.reason).withMessage('Invalid characters in reason'),
];

const rescheduleRules = [
  param('id').isMongoId(),
  body('date').matches(rx.ymd),
  body('startTime').matches(rx.hhmm),
];

const statusRules = [
  param('id').isMongoId(),
  body('status').isIn(['Booked','CheckedIn','Completed','Cancelled','NoShow']).withMessage('Invalid status'),
];

const slotsRules = [
  param('doctorId').matches(rx.idFmt),
  query('date').matches(rx.ymd),
];

module.exports = { createRules, rescheduleRules, statusRules, slotsRules, rx };
