
const express = require('express');
const router = express.Router();
const publicReportCtrl = require('../controllers/publicReportController');

// GET /api/public/reports/:ref   -> meta check
router.get('/:ref', publicReportCtrl.getByReference);

// GET /api/public/reports/:ref/download  -> actual file
router.get('/:ref/download', publicReportCtrl.downloadByReference);

module.exports = router;