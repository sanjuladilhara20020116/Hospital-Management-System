// backend/routes/labReportRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/labReportController');

// Time-series
router.get('/patients/:patientId/series', ctrl.getTimeSeries);

// Analyze / fetch by reference number (LB-...)
router.post('/by-ref/:referenceNo/analyze', ctrl.analyzeByReference);
router.get('/by-ref/:referenceNo', ctrl.getByReference);
router.get('/by-ref/:referenceNo/view', ctrl.viewByReferenceFile); // 👁 view by reference

// Analyze / fetch by Mongo _id
router.post('/:id/analyze', ctrl.analyzeReport);
router.get('/:id/view', ctrl.viewReportFile);                      // 👁 view by _id
router.get('/:id', ctrl.getReport);

module.exports = router;
