const express = require('express');
const router = express.Router();
const labReportController = require('../controllers/labReportController');
const upload = require('../middleware/upload'); // multer config
const { verifyToken, isLabAdmin, isDoctorOrPatient } = require('../middleware/auth'); // assumed role middleware

// Create lab job (Lab Admin only)
router.post('/job', verifyToken, isLabAdmin, labReportController.createLabJob);

// Upload lab report (Lab Admin only)
router.post('/upload', verifyToken, isLabAdmin, upload.single('report'), labReportController.uploadLabReport);

// Get all reports for patient (Doctor or Patient)
router.get('/patient/:patientId', verifyToken, isDoctorOrPatient, labReportController.getReportsByPatient);

// Filter reports by type (Doctor or Patient)
router.get('/filter', verifyToken, isDoctorOrPatient, labReportController.getReportsByType);

// Delete report (Lab Admin)
router.delete('/:id', verifyToken, isLabAdmin, labReportController.deleteReport);

module.exports = router;
