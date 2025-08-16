const express = require('express');
const router = express.Router();
const LabJob = require('../models/LabJob');

// LIST: /api/users/:userId/reports
router.get('/:userId/reports', async (req, res) => {
  try {
    const { userId } = req.params;
    const { testType, ref, dateFrom, dateTo } = req.query;

    if (!userId || !userId.trim()) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const filter = {
      patientId: decodeURIComponent(userId.trim()),
      status: 'Completed',
      reportFile: { $exists: true, $ne: '' },
    };
    if (testType) filter.testType = testType;
    if (ref && ref.trim()) filter.referenceNo = { $regex: ref.trim(), $options: 'i' };
    if (dateFrom || dateTo) {
      const r = {};
      if (dateFrom) r.$gte = new Date(dateFrom);
      if (dateTo)   r.$lte = new Date(dateTo + 'T23:59:59.999Z');
      filter.completedAt = r;
    }

    const jobs = await LabJob
      .find(filter)
      .select('referenceNo testType completedAt reportFile downloads')
      .sort({ completedAt: -1 });

    const items = jobs.map(j => {
      const downloadedByThisPatient = Array.isArray(j.downloads)
        ? j.downloads.some(d => d.by === userId)
        : false;

      return {
        referenceNo: j.referenceNo,
        testType: j.testType,
        completedAt: j.completedAt,
        hasReport: !!j.reportFile,
        isNew: !downloadedByThisPatient, // 👈 UI will split by this
        reportName: j.reportFile ? j.reportFile.split('/').pop() : null,
        // public link (kept for emails)
        publicDownloadUrl: `/api/public/reports/${encodeURIComponent(j.referenceNo)}/download`,
        // portal link (will mark as downloaded for this patient)
        portalDownloadUrl: `/api/users/${encodeURIComponent(userId)}/reports/${encodeURIComponent(j.referenceNo)}/download`,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('list patient reports error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PORTAL DOWNLOAD: /api/users/:userId/reports/:ref/download
router.get('/:userId/reports/:ref/download', async (req, res) => {
  try {
    const { userId, ref } = req.params;
    const LabJob = require('../models/LabJob');
    const path = require('path');
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '..', 'uploads');

    const job = await LabJob.findOne({
      patientId: decodeURIComponent(userId),
      referenceNo: decodeURIComponent(ref),
      status: 'Completed',
    });

    if (!job || !job.reportFile) {
      return res.status(404).json({ message: 'Report unavailable' });
    }

    // mark as downloaded by this patient (idempotent)
    if (!Array.isArray(job.downloads)) job.downloads = [];
    const already = job.downloads.some(d => d.by === userId);
    if (!already) {
      job.downloads.push({ by: userId, when: new Date() });
      if (!job.firstDownloadedAt) job.firstDownloadedAt = new Date();
      await job.save();
    }

    // stream file
    const abs = path.join(uploadsDir, job.reportFile);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ message: 'Report file missing' });
    }
    res.download(abs, path.basename(abs));
  } catch (e) {
    console.error('portal download error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
