// controllers/publicReportController.js
const fs = require('fs');
const path = require('path');
const LabJob = require('../models/LabJob');

const uploadsDir = path.join(__dirname, '..', 'uploads');

exports.getByReference = async (req, res) => {
  try {
    const ref = req.params.ref;
    const job = await LabJob.findOne({ referenceNo: ref }).select(
      'referenceNo patientName testType status reportFile completedAt'
    );
    if (!job) return res.status(404).json({ message: 'Report not found' });
    if (job.status !== 'Completed') {
      return res.status(409).json({ message: 'Report not completed yet' });
    }

    const abs = job.reportFile ? path.join(uploadsDir, job.reportFile) : null;
    const exists = abs && fs.existsSync(abs);
    if (!exists) return res.status(404).json({ message: 'Report file missing' });

    res.json({
      referenceNo: job.referenceNo,
      patientName: job.patientName,
      testType: job.testType,
      completedAt: job.completedAt,
      canDownload: true,
    });
  } catch (e) {
    console.error('getByReference error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.downloadByReference = async (req, res) => {
  try {
    const ref = req.params.ref;
    const job = await LabJob.findOne({ referenceNo: ref });
    if (!job || job.status !== 'Completed') {
      return res.status(404).json({ message: 'Report unavailable' });
    }
    const abs = job.reportFile ? path.join(uploadsDir, job.reportFile) : null;
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ message: 'Report file missing' });
    }
    res.download(abs, path.basename(abs));
  } catch (e) {
    console.error('downloadByReference error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
