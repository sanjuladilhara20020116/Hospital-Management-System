
// backend/controllers/analyzeController.js
const fs = require('fs');
const path = require('path');
const LabReport = require('../models/LabReport');
const LabJob = require('../models/LabJob');

// IMPORTANT: use the PDF-aware extractor identical to your mini project
const { extractFromReport, analyzeValues } = require('../utils/aiExtract');

const isObjectId = (s) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
const ensureAbsolute = (p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Accepts { key } where key is a LabReport _id OR a LabJob referenceNo
// ...top of file unchanged
exports.runAnalysis = async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ ok: false, message: 'key is required' });

    let report;
    let absPath;
    let reportType;
    let patientRef;
    let completedAt;

    if (isObjectId(key)) {
      // A) LabReport _id
      report = await LabReport.findById(key);
      if (!report) return res.status(404).json({ ok:false, message: 'LabReport not found' });

      // ✅ hard-lock: don’t re-analyze
      if (report.isAnalyzed) {
        return res.status(409).json({
          ok: false,
          code: 'ALREADY_ANALYZED',
          message: 'This report has already been analyzed.',
          reportId: report._id,
        });
      }

      absPath = ensureAbsolute(report.filePath || '');
      if (!absPath || !fs.existsSync(absPath)) {
        return res.status(404).json({ ok:false, message: 'Report file missing on disk' });
      }
      reportType  = report.reportType || 'Cholesterol';
      patientRef  = report.patientId;
      completedAt = report.uploadDate || new Date();

    } else {
      // B) LabJob reference
      const job = await LabJob.findOne({ referenceNo: key, status: 'Completed' });
      if (!job) return res.status(404).json({ ok:false, message: 'Completed job not found for this reference' });
      if (!job.reportFile) return res.status(404).json({ ok:false, message: 'No report file on this job' });

      absPath = path.isAbsolute(job.reportFile) ? job.reportFile : path.join(uploadsDir, job.reportFile);
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ ok:false, message: 'Report file missing on disk' });
      }

      reportType  = job.testType || 'Cholesterol';
      patientRef  = job.patientRef;
      completedAt = job.completedAt || new Date();

      // find or create bound LabReport
      report = await LabReport.findOne({
        patientId: patientRef,
        reportType,
        filePath: absPath,
      });

      // ✅ if it exists AND already analyzed, short-circuit
      if (report && report.isAnalyzed) {
        return res.status(409).json({
          ok: false,
          code: 'ALREADY_ANALYZED',
          message: 'This report has already been analyzed.',
          reportId: report._id,
        });
      }

      if (!report) {
        report = await LabReport.create({
          patientId: patientRef,
          reportType,
          filePath: absPath,
          uploadDate: completedAt,
        });
      }
    }

    // … keep the existing extraction/analysis code …
    // after saving:
    // await report.save();
    // await saveCholesterolSnapshot(report);
    // return res.json({ ok: true, reportId: report._id, report });

  } catch (err) {
    console.error('runAnalysis error:', err);
    return res.status(500).json({ ok:false, message: err.message });
  }
};