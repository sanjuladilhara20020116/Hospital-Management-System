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
    .isIn(TEST_TYPES).withMessage('Invalid test type'),

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
  body('testType').optional().isIn(TEST_TYPES),
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
exports.listFilterValidation = [
  query('page').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
  query('limit').optional({ checkFalsy: true }).toInt().isInt({ min: 1, max: 100 }),
  query('status').optional({ checkFalsy: true }).isIn(['Pending','Completed']),
  query('patientId').optional({ checkFalsy: true }).trim()
    .matches(/^P\d{4}\/\d{3}\/\d+$/).withMessage('Invalid patientId'),
  query('testType').optional({ checkFalsy: true })
    .isIn(['Cholesterol','Diabetes','X-ray','Full Blood Count','Liver Function','Kidney Function','Other']),
  query('dateFrom').optional({ checkFalsy: true }).isISO8601().withMessage('dateFrom must be YYYY-MM-DD'),
  query('dateTo').optional({ checkFalsy: true }).isISO8601().withMessage('dateTo must be YYYY-MM-DD'),
];

