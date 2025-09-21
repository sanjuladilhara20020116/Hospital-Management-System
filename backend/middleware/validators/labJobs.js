// backend/middleware/validators/labJobs.js
const { body, param, query } = require('express-validator');
const User = require('../../models/User'); // (not used directly, fine to keep)

// CREATE
const TEST_TYPES = [
  'Cholesterol','Diabetes','X-ray','Full Blood Count','Liver Function','Kidney Function','Other'
];

// add near the top of labJobs.js
const SLOT_REQUIRED_RE = /\b(fasting|random|post\s*prandial|ogtt|tolerance|glucose|insulin)\b/i;


exports.createJobValidation = [
  body('patientName')
    .trim().isLength({ min: 2, max: 80 }).withMessage('Patient name is required'),
  body('patientId')
    .trim()
    .matches(/^P2025\/\d{3}\/\d{2,4}$/)
    .withMessage('Patient ID must look like P2025/NNN/NN–NNNN'),
  body('testType')
    .isString().trim().isLength({ min: 1, max: 80 })
    .matches(/^[A-Za-z0-9][A-Za-z0-9\s\/\-\+\(\)]{0,79}$/)
    .withMessage('Only letters, numbers, spaces, / - + ( ) allowed (max 80)')
    .custom(v => !/(?:^|\b)(xray|x-ray|ultrasound|ct\b|mri\b|dicom)(?:\b|$)/i.test(v))
    .withMessage('PDF tests only. Imaging tests are not allowed'),

  body('scheduledDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledDate must be ISO8601 datetime')
    .toDate(),

  body('timeSlot')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Morning','Afternoon','Evening','Night'])
    .withMessage('Invalid time slot'),

  // ✅ Require timeSlot only for “timed” tests
  body('timeSlot').custom((slot, { req }) => {
    const tt = String(req.body.testType || '');
    const needsSlot = SLOT_REQUIRED_RE.test(tt);
    if (needsSlot && !slot) throw new Error('Time Slot is required for this test');
    return true;
  }),
];

exports.updateJobValidation = [
  body('patientName').optional().trim().isLength({ min: 2, max: 80 }),
  body('patientId').optional().trim().matches(/^P2025\/\d{3}\/\d{2,4}$/),
  body('testType').optional().isString().trim().isLength({ min: 1, max: 80 })
    .matches(/^[A-Za-z0-9][A-Za-z0-9\s\/\-\+\(\)]{0,79}$/)
    .withMessage('Only letters, numbers, spaces, / - + ( ) allowed (max 80)')
    .custom(v => !/(?:^|\b)(xray|x-ray|ultrasound|ct\b|mri\b|dicom)(?:\b|$)/i.test(v))
    .withMessage('PDF tests only. Imaging tests are not allowed'),
  body('scheduledDate').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  body('timeSlot').optional({ nullable: true, checkFalsy: true })
    .isIn(['Morning','Afternoon','Evening','Night']).withMessage('Invalid time slot'),
  // ✅ same conditional requirement on update
  body('timeSlot').custom((slot, { req }) => {
    const tt = String(req.body.testType || req.existingJob?.testType || '');
    const needsSlot = SLOT_REQUIRED_RE.test(tt);
    if (needsSlot && !slot) throw new Error('Time Slot is required for this test');
    return true;
  }),
];


// ID param
exports.idParamValidation = [
  param('id').isMongoId().withMessage('Invalid id'),
];

// Pagination (basic)
exports.paginationValidation = [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
];

// LIST filters (loose; allow partials for searching by ending digits)
exports.listFilterValidation = [
  query('page').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
  query('limit').optional({ checkFalsy: true }).toInt().isInt({ min: 1, max: 100 }),
  query('status').optional({ checkFalsy: true }).isIn(['Pending','Completed']),

  // free-text partials for search (type last digits etc.)
  query('patientId').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }),
  query('testType').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }),

  // reference number partial search (e.g., "000123")
  query('referenceNo').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
];
