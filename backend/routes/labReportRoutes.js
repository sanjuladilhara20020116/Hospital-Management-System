
const express = require('express');
const router = express.Router();

// If you really want public routes here, keep them.
// (Ideally they live in a separate publicReportRoutes file.)
const publicReportCtrl = require('../controllers/publicReportController');

// GET /api/public/reports/:ref   -> meta check
// ✅ Import ALL handlers from labReportController
const {
  analyzeReport,
  getReport,
  analyzeByReference,
  getByReference,
  getTimeSeries,           // <-- add this
} = require('../controllers/labReportController');

router.get('/patients/:patientId/series', getTimeSeries);  // <-- use it directly

// 1) By-ref FIRST
router.post('/by-ref/:referenceNo/analyze', analyzeByReference);
router.get('/by-ref/:referenceNo', getByReference);

// GET /api/public/reports/:ref/download  -> actual file
// 2) Then /:id
router.post('/:id/analyze', analyzeReport);
router.get('/:id', getReport);

// 3) And ONLY AFTER THAT the public catch-alls
router.get('/:ref', publicReportCtrl.getByReference);
router.get('/:ref/download', publicReportCtrl.downloadByReference);


module.exports = router;