const express = require('express');
const router = express.Router();
const LabJob = require('../models/LabJob');

// GET /api/users/:userId/reports
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
      const range = {};
      if (dateFrom) range.$gte = new Date(dateFrom);
      if (dateTo)   range.$lte = new Date(dateTo + 'T23:59:59.999Z');
      filter.completedAt = range;
    }

    const jobs = await LabJob
      .find(filter)
      .select('referenceNo testType completedAt reportFile')
      .sort({ completedAt: -1 });

    const items = jobs.map(j => ({
      referenceNo: j.referenceNo,
      testType: j.testType,
      completedAt: j.completedAt,
      hasReport: !!j.reportFile,
      reportName: j.reportFile ? j.reportFile.split('/').pop() : null,
      downloadUrl: j.referenceNo
        ? `/api/public/reports/${encodeURIComponent(j.referenceNo)}/download`
        : null,
    }));

    res.json({ items });
  } catch (e) {
    console.error('list patient reports error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
