// routes/labJobRoutes.js
const express = require('express');
const router = express.Router();

const {
  createLabJob,
  getLabJobs,
  uploadLabReport,
  downloadReport,
  updateLabJob,
  deleteLabJob,
  repeatLabJob,
} = require('../controllers/labJobController');

const actorLabAdmin = require('../middleware/actorLabAdmin');
const {
  createJobValidation,
  idParamValidation,
  updateJobValidation,
  listFilterValidation,
} = require('../middleware/validators/labJobs');
const { validate } = require('../middleware/validators');

// Use shared uploader (stores into /uploads, returns req.file.filename)
const upload = require('../middleware/upload');

// Create
router.post(
  '/',
  actorLabAdmin,
  createJobValidation, validate,
  createLabJob
);

// Repeat order
router.post(
  '/:id/repeat',
  actorLabAdmin,
  idParamValidation, validate,
  repeatLabJob
);

// List (own)
router.get(
  '/',
  actorLabAdmin,
  listFilterValidation, validate,
  getLabJobs
);

// Update (Pending only)
router.put(
  '/:id',
  actorLabAdmin,
  idParamValidation, updateJobValidation, validate,
  updateLabJob
);

// Delete (Pending only)
router.delete(
  '/:id',
  actorLabAdmin,
  idParamValidation, validate,
  deleteLabJob
);

// Upload report (complete)
router.post(
  '/:id/report',
  actorLabAdmin,
  idParamValidation, validate,
  upload.single('reportFile'),
  uploadLabReport
);

// Secure download (owner)
router.get(
  '/:id/download',
  actorLabAdmin,
  idParamValidation, validate,
  downloadReport
);

module.exports = router;
