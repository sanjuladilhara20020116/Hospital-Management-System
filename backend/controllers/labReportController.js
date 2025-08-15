const LabReport = require('../models/LabReport');
const LabJob = require('../models/LabJob');
const path = require('path');

// Add new lab job (by Lab Admin)
exports.createLabJob = async (req, res) => {
  try {
    const { patientId, testType, assignedDate } = req.body;

    const job = new LabJob({ patientId, testType, assignedDate });
    await job.save();

    res.status(201).json({ message: 'Lab job created', job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lab job' });
  }
};

// Upload report (by Lab Admin)
exports.uploadLabReport = async (req, res) => {
  try {
    const { patientId, reportType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const report = new LabReport({
      patientId,
      reportType,
      filePath: file.path
    });

    await report.save();

    // Optional: Mark related job as completed
    await LabJob.findOneAndUpdate(
      { patientId, testType: reportType, status: 'Pending' },
      { status: 'Completed' }
    );

    res.status(201).json({ message: 'Report uploaded', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload report' });
  }
};

// Get reports by patient ID (for doctors/patients)
exports.getReportsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const reports = await LabReport.find({ patientId }).sort({ uploadDate: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get reports filtered by type
exports.getReportsByType = async (req, res) => {
  try {
    const { patientId, type } = req.query;
    const filter = { patientId };
    if (type) filter.reportType = type;

    const reports = await LabReport.find(filter).sort({ uploadDate: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to filter reports' });
  }
};

// Delete report (Lab Admin)
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await LabReport.findByIdAndDelete(id);
    res.status(200).json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
};
