// backend/middleware/validators/labJobs.js
const { body, param, query } = require('express-validator');
const User = require('../../models/User');

// CREATE
const TEST_TYPES = [
  'Cholesterol','Diabetes','X-ray','Full Blood Count','Liver Function','Kidney Function','Other'
];

exports.createJobValidation = [
  body('patientName')
    .trim().isLength({ min: 2, max: 80 }).withMessage('Patient name is required'),
  body('patientId')
    .trim()
    .matches(/^P\d{4}\/\d{3}\/\d+$/)
    .withMessage('Patient ID must look like P2025/123/1'),
  body('testType')
   .isString().trim().isLength({ min: 1, max: 80 })
   .matches(/^[A-Za-z0-9][A-Za-z0-9\s\/\-\+\(\)]{0,79}$/)
   .withMessage('Only letters, numbers, spaces, / - + ( ) allowed (max 80)')
   .custom((v) => !/(?:^|\b)(xray|x-ray|ultrasound|ct\b|mri\b|dicom)(?:\b|$)/i.test(v))
   .withMessage('PDF tests only. Imaging tests are not allowed'),
  // ✅ optional and skip empty string
  body('scheduledDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledDate must be ISO8601 datetime')
    .toDate(),

  // ✅ optional time slot
  body('timeSlot')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Morning','Afternoon','Evening','Night'])
    .withMessage('Invalid time slot'),
];

exports.updateJobValidation = [
  body('patientName').optional().trim().isLength({ min: 2, max: 80 }),
  body('patientId').optional().trim().matches(/^P\d{4}\/\d{3}\/\d+$/),
  body('testType').optional().isString().trim().isLength({ min: 1, max: 80 })
   .matches(/^[A-Za-z0-9][A-Za-z0-9\s\/\-\+\(\)]{0,79}$/)
   .withMessage('Only letters, numbers, spaces, / - + ( ) allowed (max 80)')
   .custom((v) => !/(?:^|\b)(xray|x-ray|ultrasound|ct\b|mri\b|dicom)(?:\b|$)/i.test(v))
   .withMessage('PDF tests only. Imaging tests are not allowed'),
  body('scheduledDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().toDate(),
  body('timeSlot')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Morning','Afternoon','Evening','Night']),
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

// LIST filters (the one your route needs)
// LIST filters (loose; allow partials)
exports.listFilterValidation = [
  query('page').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
  query('limit').optional({ checkFalsy: true }).toInt().isInt({ min: 1, max: 100 }),
  query('status').optional({ checkFalsy: true }).isIn(['Pending','Completed']),

  // allow free text (partial) – just trim and cap length
  query('patientId').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }),
  query('testType').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }),

  // new: reference number partial search (e.g., "000123")
  query('referenceNo').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
];
