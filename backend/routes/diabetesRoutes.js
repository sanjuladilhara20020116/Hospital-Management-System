// backend/routes/diabetesRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/diabetesController');

// Diabetes preview (no DB write)
// Support both POST and GET, plus alias under /reports/:id/diabetes/preview
router.post('/diabetes/:id/preview', ctrl.preview);
router.get('/diabetes/:id/preview', ctrl.preview);

router.post('/reports/:id/diabetes/preview', ctrl.preview);
router.get('/reports/:id/diabetes/preview', ctrl.preview);

// Optional: Save diabetes-only extraction
router.post('/diabetes/:id/analyze', ctrl.analyzeAndSave);

module.exports = router;
