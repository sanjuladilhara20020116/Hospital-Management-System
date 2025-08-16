const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labReportController');

// health
router.get('/analyze-ok', (req, res) => res.json({ ok: true }));

// analyze (by key: reportId or referenceNo)
router.post('/analyze', ctrl.runAnalysis);

// reports
router.get('/reports/:id', ctrl.getReport);

// ✅ NEW: advice endpoint exactly where the FE calls it
router.get('/reports/:id/advice', ctrl.getAdvice);

router.post('/reports/:id/analyze', ctrl.analyzeReport);
router.post('/references/:referenceNo/analyze', ctrl.analyzeByReference);
router.get('/references/:referenceNo', ctrl.getByReference);

module.exports = router;
