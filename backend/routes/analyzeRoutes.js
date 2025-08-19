const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labReportController');

// health
router.get('/analyze-ok', (req, res) => res.json({ ok: true }));

// analyze (by key: reportId or referenceNo)
router.post('/analyze', ctrl.runAnalysis);

// reports
router.get('/reports/:id', ctrl.getReport);

// advice
router.get('/reports/:id/advice', ctrl.getAdvice);

// ✅ PREVIEW used by the frontend (GET)
router.get('/reports/:id/extract-preview', ctrl.previewExtract);

// (optional) keep this for backwards-compat; it calls the same handler
router.post('/reports/:id/diabetes/preview', ctrl.previewExtract);

// per-report and by-reference analyze endpoints (still fine to keep)
router.post('/reports/:id/analyze', ctrl.analyzeReport);
router.post('/references/:referenceNo/analyze', ctrl.analyzeByReference);

// reference fetch
router.get('/references/:referenceNo', ctrl.getByReference);

// time-series for charts
router.get('/patients/:patientId/series', ctrl.getTimeSeries);

// compare a report with the previous one for same patient/type
router.get('/reports/:id/compare', ctrl.compareToPrevious);


module.exports = router;
