// backend/controllers/labReportController.js
const fs = require('fs');
const path = require('path');

const LabReport = require('../models/LabReport');
const LabJob    = require('../models/LabJob');

// Cholesterol utilities (existing)
const { extractFromReport, analyzeValues } = require('../utils/aiExtract');

// Hand off Diabetes work to a separate controller
const diabetesCtrl = require('./diabetesController');

// -------------------- helpers --------------------
const isObjectId = (s) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
const ensureAbsolute = (p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const toCategory = (s = '') => {
  const t = String(s).toLowerCase();
  if (!t || t.includes('unknown')) return 'unknown';
  if (t.includes('optimal') || t.includes('protective') || t.includes('desirable') || t.includes('normal') || t.includes('good')) return 'good';
  if (t.includes('near') || t.includes('borderline')) return 'moderate';
  if (t.includes('high')) return 'bad';
  return 'unknown';
};
const REFS = {
  ldl:   'LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190',
  hdl:   'HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60',
  tg:    'Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500',
  total: 'Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240',
};

// -------------------- CRUD --------------------
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

exports.uploadLabReport = async (req, res) => {
  try {
    const { patientId, reportType } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const report = await LabReport.create({
      patientId,
      reportType,
      filePath: file.path,
      uploadDate: new Date(),
    });

    await LabJob.findOneAndUpdate(
      { patientId, testType: reportType, status: 'Pending' },
      { status: 'Completed' }
    );

    res.status(201).json({ message: 'Report uploaded', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload report' });
  }
};

exports.getReportsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const reports = await LabReport.find({ patientId }).sort({ uploadDate: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

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

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await LabReport.findByIdAndDelete(id);
    res.status(200).json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// -------------------- ANALYZE BY REPORT _id --------------------
exports.analyzeReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await LabReport.findById(id);
    if (!report) return res.status(404).json({ ok: false, message: 'Report not found' });

    if (report.isAnalyzed) {
      return res.status(409).json({ ok: true, message: 'Already analyzed', reportId: report._id, report });
    }

    const absolutePath = ensureAbsolute(report.filePath || '');
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ ok: false, message: 'Report file missing on disk' });
    }

    const isDiabetes = /(diab)/i.test(report.reportType || '');

    if (isDiabetes) {
      // Delegate to the Diabetes controller (keeps this file cholesterol-only)
      return diabetesCtrl.analyzeAndSave(req, res);
    }

    // ---- Cholesterol path (unchanged) ----
    const extracted = await extractFromReport({
      filePath: absolutePath,
      originalName: path.basename(absolutePath),
      reportType: report.reportType || 'Cholesterol',
    });

    const analysis = await analyzeValues({
      ldl: extracted.ldl,
      hdl: extracted.hdl,
      triglycerides: extracted.triglycerides,
      totalCholesterol: extracted.totalCholesterol,
      units: extracted.units || 'mg/dL',
    });

    const payload = {
      extracted: {
        testDate: extracted.testDate || null,
        labName: extracted.labName || '',
        patientNameOnReport: extracted.patientName || '',
        totalCholesterol: extracted.totalCholesterol ?? null,
        ldl: extracted.ldl ?? null,
        hdl: extracted.hdl ?? null,
        triglycerides: extracted.triglycerides ?? null,
        units: extracted.units || 'mg/dL',
        notes: extracted.notes || '',
      },
      analysis: analysis || {},
      isAnalyzed: true,
      analyzedAt: new Date(),
    };

    const updated = await LabReport.findByIdAndUpdate(
      report._id,
      { $set: payload },
      { new: true }
    );

    return res.json({ ok: true, reportId: updated._id, report: updated });
  } catch (err) {
    console.error('analyzeReport error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- GET ONE REPORT --------------------
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const dbDoc = await LabReport.findById(id);
    if (!dbDoc) return res.status(404).json({ ok: false, message: 'Not found' });

    const r = dbDoc.toObject();
    const a = r.analysis || {};

    const hasLegacy =
      a && typeof a === 'object' &&
      ('ldlStatus' in a || 'hdlStatus' in a || 'triglycerideStatus' in a || 'totalCholesterolStatus' in a);
    const missingBuckets = !a || !a.ldl || !a.hdl || !a.triglycerides || !a.totalCholesterol;

    if (hasLegacy && missingBuckets) {
      const ex = r.extracted || {};
      r.analysis = {
        ldl: { value: ex.ldl ?? null, category: toCategory(a.ldlStatus), reference: REFS.ldl },
        hdl: { value: ex.hdl ?? null, category: toCategory(a.hdlStatus), reference: REFS.hdl },
        triglycerides: { value: ex.triglycerides ?? null, category: toCategory(a.triglycerideStatus), reference: REFS.tg },
        totalCholesterol: { value: ex.totalCholesterol ?? null, category: toCategory(a.totalCholesterolStatus), reference: REFS.total },
        notes: a.summary || '',
        nextSteps: Array.isArray(a.tips) ? a.tips : [],
      };
    }

    return res.json({ ok: true, report: r });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- ANALYZE BY REFERENCE (LB-...) --------------------
exports.analyzeByReference = async (req, res) => {
  try {
    const { referenceNo } = req.params;

    const job = await LabJob.findOne({ referenceNo, status: 'Completed' });
    if (!job) return res.status(404).json({ ok: false, message: 'Completed job not found' });
    if (!job.reportFile) return res.status(404).json({ ok: false, message: 'No report file on this job' });

    const abs = path.isAbsolute(job.reportFile) ? job.reportFile : path.join(uploadsDir, job.reportFile);
    if (!fs.existsSync(abs)) return res.status(404).json({ ok: false, message: 'Report file missing on disk' });

    const isDiabetes = /(diab)/i.test(job.testType || '');

    // Ensure a LabReport row exists
    const base = {
      patientId: job.patientRef,
      reportType: job.testType,
      filePath: abs,
      uploadDate: job.completedAt || new Date(),
    };
    const report = await LabReport.findOneAndUpdate(
      { patientId: job.patientRef, reportType: job.testType, filePath: abs },
      { $setOnInsert: base },
      { new: true, upsert: true }
    );

    if (report.isAnalyzed) {
      return res.status(409).json({ ok: true, message: 'Already analyzed', reportId: report._id, report });
    }

    if (isDiabetes) {
      // Delegate Diabetes save to its controller by id
      req.params.id = report._id.toString();
      return diabetesCtrl.analyzeAndSave(req, res);
    }

    // ---- Cholesterol path ----
    const extracted = await extractFromReport({
      filePath: abs,
      originalName: job.reportFile,
      reportType: job.testType || 'Cholesterol',
    });

    const analysis = await analyzeValues({
      ldl: extracted.ldl,
      hdl: extracted.hdl,
      triglycerides: extracted.triglycerides,
      totalCholesterol: extracted.totalCholesterol,
      units: extracted.units || 'mg/dL',
    });

    const payload = {
      ...base,
      extracted: {
        testDate: extracted.testDate || null,
        labName: extracted.labName || '',
        patientNameOnReport: extracted.patientName || '',
        totalCholesterol: extracted.totalCholesterol ?? null,
        ldl: extracted.ldl ?? null,
        hdl: extracted.hdl ?? null,
        triglycerides: extracted.triglycerides ?? null,
        units: extracted.units || 'mg/dL',
        notes: extracted.notes || '',
      },
      analysis: analysis || {},
      isAnalyzed: true,
      analyzedAt: new Date(),
    };

    const updated = await LabReport.findOneAndUpdate(
      { _id: report._id },
      { $set: payload },
      { new: true }
    );

    return res.json({ ok: true, reportId: updated._id, report: updated });
  } catch (err) {
    console.error('analyzeByReference error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- GET BY REFERENCE --------------------
exports.getByReference = async (req, res) => {
  try {
    const { referenceNo } = req.params;
    const job = await LabJob.findOne({ referenceNo });
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    const abs = job.reportFile
      ? (path.isAbsolute(job.reportFile) ? job.reportFile : path.join(uploadsDir, job.reportFile))
      : null;

    const report = await LabReport.findOne({
      patientId: job.patientRef,
      reportType: job.testType,
      ...(abs ? { filePath: abs } : {}),
    });

    if (!report) return res.status(404).json({ ok: false, message: 'Report not found for this reference' });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- /api/analyze (by key) --------------------
exports.runAnalysis = async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ ok: false, message: 'key is required' });

    if (isObjectId(key)) {
      const doc = await LabReport.findById(key);
      if (!doc) return res.status(404).json({ ok: false, message: 'Report not found' });
      req.params.id = key;
      // route by type
      if (/(diab)/i.test(doc.reportType || '')) {
        return diabetesCtrl.analyzeAndSave(req, res);
      }
      return exports.analyzeReport(req, res);
    }

    // treat as referenceNo
    req.params.referenceNo = key;
    return exports.analyzeByReference(req, res);
  } catch (err) {
    console.error('runAnalysis error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- Cholesterol advice --------------------
exports.getAdvice = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Report not found' });

    const r = doc.toObject();
    const ex = r.extracted || {};
    let a  = r.analysis || {};

    const isLegacy =
      a && typeof a === 'object' &&
      ('ldlStatus' in a || 'hdlStatus' in a || 'triglycerideStatus' in a || 'totalCholesterolStatus' in a);

    if (isLegacy) {
      a = {
        ldl: { value: ex.ldl ?? null, category: toCategory(a.ldlStatus), reference: REFS.ldl },
        hdl: { value: ex.hdl ?? null, category: toCategory(a.hdlStatus), reference: REFS.hdl },
        triglycerides: { value: ex.triglycerides ?? null, category: toCategory(a.triglycerideStatus), reference: REFS.tg },
        totalCholesterol: { value: ex.totalCholesterol ?? null, category: toCategory(a.totalCholesterolStatus), reference: REFS.total },
        notes: a.summary || '',
        nextSteps: Array.isArray(a.tips) ? a.tips : [],
      };
    }

    const bullets = [];
    const catText = (cat) =>
      cat === 'good' ? 'looks good' :
      cat === 'moderate' ? 'is borderline—keep an eye on it' :
      cat === 'bad' ? 'is high—please discuss with your clinician' :
      'has no category available';

    if (a.ldl) bullets.push(`LDL ${a.ldl.value ?? '—'} mg/dL ${a.ldl.category ? `(${catText(a.ldl.category)})` : ''}.`);
    if (a.hdl) bullets.push(`HDL ${a.hdl.value ?? '—'} mg/dL ${a.hdl.category ? `(${catText(a.hdl.category)})` : ''}.`);
    if (a.triglycerides) bullets.push(`Triglycerides ${a.triglycerides.value ?? '—'} mg/dL ${a.triglycerides.category ? `(${catText(a.triglycerides.category)})` : ''}.`);
    if (a.totalCholesterol) bullets.push(`Total Cholesterol ${a.totalCholesterol.value ?? '—'} mg/dL ${a.totalCholesterol.category ? `(${catText(a.totalCholesterol.category)})` : ''}.`);

    const headline =
      a?.ldl?.category === 'bad'
        ? 'Your LDL is high—consider lifestyle changes and follow up with your clinician.'
        : a?.hdl?.category === 'good'
        ? 'Your HDL is in a protective range.'
        : 'Review your latest lipid profile below.';

    return res.json({
      ok: true,
      advice: {
        headline,
        bullets,
        notes: a.notes || '',
        nextSteps: Array.isArray(a.nextSteps) ? a.nextSteps : [],
      }
    });
  } catch (err) {
    console.error('getAdvice error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// -------------------- READ-ONLY PREVIEW for FE --------------------
// GET /api/reports/:id/extract-preview
exports.previewExtract = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: "Report not found" });

    const abs = ensureAbsolute(doc.filePath || "");
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ ok: false, message: "Report file missing on disk" });
    }

    // If Diabetes → forward to diabetes preview (keeps parity with your FE without duplication)
    if (/(diab)/i.test(String(doc.reportType || ''))) {
      return diabetesCtrl.preview(req, res);
    }

    // Cholesterol preview
    const extracted = await extractFromReport({
      filePath: abs,
      originalName: path.basename(abs),
      reportType: doc.reportType || "Cholesterol",
    });

    return res.json({ ok: true, extracted });
  } catch (e) {
    console.error("previewExtract error:", e);
    return res.status(500).json({ ok: false, message: e.message });
  }
};
