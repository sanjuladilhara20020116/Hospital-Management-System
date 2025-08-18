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

// --- OpenRouter helpers (used by getAdvice and/or extraction) ---
const safeParseJSON = (txt) => {
  try { return JSON.parse(txt); } catch {
    const m = String(txt || '').match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return {};
  }
};

let fetchFn = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

async function callOpenRouterJSON(payload) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  const resp = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Lab Report Advice',
    },
    body: JSON.stringify(payload),
  });
  const ej = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(ej?.error?.message || `OpenRouter error ${resp.status}`);
  return ej?.choices?.[0]?.message?.content ?? '{}';
}


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
// -------------------- AI Coach advice via OpenRouter (LLM) --------------------
exports.getAdvice = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Report not found' });

    const r  = doc.toObject();
    const ex = r.extracted || {};
    let a    = r.analysis || {};
    const type = String(r.reportType || '').toLowerCase();

    // If cholesterol analysis is legacy shape, adapt to buckets for clarity
    const isLegacy =
      a && typeof a === 'object' &&
      ('ldlStatus' in a || 'hdlStatus' in a || 'triglycerideStatus' in a || 'totalCholesterolStatus' in a);

    const toCategory = (s = '') => {
      const t = String(s).toLowerCase();
      if (!t || t.includes('unknown')) return 'unknown';
      if (t.includes('optimal') || t.includes('protective') || t.includes('desirable') || t.includes('normal') || t.includes('good')) return 'good';
      if (t.includes('near') || t.includes('borderline')) return 'moderate';
      if (t.includes('high')) return 'bad';
      return 'unknown';
    };

    if (type.includes('chol') && isLegacy) {
      a = {
        ldl:              { value: ex.ldl ?? null,              category: toCategory(a.ldlStatus) },
        hdl:              { value: ex.hdl ?? null,              category: toCategory(a.hdlStatus) },
        triglycerides:    { value: ex.triglycerides ?? null,    category: toCategory(a.triglycerideStatus) },
        totalCholesterol: { value: ex.totalCholesterol ?? null, category: toCategory(a.totalCholesterolStatus) },
        notes: a.summary || '',
        nextSteps: Array.isArray(a.tips) ? a.tips : [],
      };
    }

    // ---------- Build compact payload for the model ----------
    const payload = { reportType: r.reportType, extracted: ex };

    if (type.includes('chol')) {
      payload.analysisBuckets = {
        ldl:              a?.ldl?.category || 'unknown',
        hdl:              a?.hdl?.category || 'unknown',
        triglycerides:    a?.triglycerides?.category || 'unknown',
        totalCholesterol: a?.totalCholesterol?.category || 'unknown',
      };
    } else {
      // Diabetes: compute statuses so model has clear context
      const gUnit = ex.glucoseUnits || 'mg/dL';
      const toMgDl = (v) => (v == null ? null : (gUnit === 'mmol/L' ? Number(v) * 18 : Number(v)));
      const fasting = toMgDl(ex.fastingGlucose);
      const pp      = toMgDl(ex.postPrandialGlucose ?? ex.ogtt2h);
      const random  = toMgDl(ex.randomGlucose);
      const a1c     = ex.hba1c != null ? Number(ex.hba1c) : null;

      const classify = {
        fasting(v){ if (v==null) return 'unknown'; if (v>=126) return 'Diabetes'; if (v>=100) return 'Prediabetes'; return 'Normal'; },
        pp2h(v){    if (v==null) return 'unknown'; if (v>=200) return 'Diabetes'; if (v>=140) return 'Prediabetes'; return 'Normal'; },
        random(v){  if (v==null) return 'unknown'; if (v>=200) return 'Diabetes'; if (v>=140) return 'Prediabetes'; return 'Normal'; },
        a1c(p){     if (p==null) return 'unknown'; if (p>=6.5)  return 'Diabetes'; if (p>=5.7)  return 'Prediabetes'; return 'Normal'; },
      };
      payload.statuses = {
        fasting: classify.fasting(fasting),
        postPrandial: classify.pp2h(pp),
        random: classify.random(random),
        hba1c: classify.a1c(a1c),
      };
      payload.glucoseMgDl = { fasting, postPrandial: pp, random, hba1c: a1c };
    }

    // ---------- LLM call (OpenRouter) ----------
    const system = `
You are a careful medical explainer. Return ONLY compact JSON, no markdown.
Keys required:
- "healthStatus": short sentence.
- "reasons": array (2-5 short, neutral bullets).
- "recommendations": array (3-6 short, non-medical-advice bullets).
- "breakdown": object of one-sentence meanings for each provided marker.
Avoid diagnoses; be educational and neutral. Use units provided (assume mg/dL for glucose, % for HbA1c if missing).
`.trim();

    const user = `Lab context:\n${JSON.stringify(payload)}\n\nReturn ONLY the JSON with the required keys.`;

    const content = await callOpenRouterJSON({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user  },
      ],
      temperature: 0.2,
    });

    const out = safeParseJSON(content) || {};
    // normalize shape defensively
    out.reasons = Array.isArray(out.reasons) ? out.reasons : [];
    out.recommendations = Array.isArray(out.recommendations) ? out.recommendations : [];
    out.breakdown = out.breakdown && typeof out.breakdown === 'object' ? out.breakdown : {};

    return res.json({ ok: true, advice: out });
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

// ================== TIME SERIES & COMPARE (for charts/summary) ==================

/** Build a compact numeric snapshot from a report's extracted values. */
function _snapshot(report) {
  const ex = report?.extracted || {};
  const type = String(report?.reportType || '');
  const snap = { date: report?.uploadDate || report?.createdAt || null };

  if (/chol/i.test(type)) {
    // Cholesterol
    if (ex.totalCholesterol != null) snap.totalCholesterol = Number(ex.totalCholesterol);
    if (ex.ldl != null)             snap.ldl = Number(ex.ldl);
    if (ex.hdl != null)             snap.hdl = Number(ex.hdl);
    if (ex.triglycerides != null)   snap.triglycerides = Number(ex.triglycerides);
  } else if (/diab/i.test(type)) {
    // Diabetes
    if (ex.fastingGlucose != null)      snap.fastingGlucose = Number(ex.fastingGlucose);
    if (ex.postPrandialGlucose != null) snap.postPrandialGlucose = Number(ex.postPrandialGlucose);
    if (ex.randomGlucose != null)       snap.randomGlucose = Number(ex.randomGlucose);
    if (ex.ogtt2h != null)              snap.ogtt2h = Number(ex.ogtt2h);
    if (ex.hba1c != null)               snap.hba1c = Number(ex.hba1c);
  }

  return snap;
}

/** GET /api/patients/:patientId/series?type=Cholesterol|Diabetes
 *  Returns arrays you can use for charts. If `type` omitted, returns both.
 */
exports.getTimeSeries = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type } = req.query; // optional

    const filter = { patientId };
    if (type) filter.reportType = type;

    const reports = await LabReport
      .find(filter, { extracted: 1, reportType: 1, uploadDate: 1, createdAt: 1 })
      .sort({ uploadDate: 1, createdAt: 1 });

    const chol = [];
    const diab = [];

    for (const r of reports) {
      const snap = _snapshot(r);
      if (/chol/i.test(r.reportType)) chol.push(snap);
      if (/diab/i.test(r.reportType)) diab.push(snap);
    }

    // If client asked a specific type, send just that
    if (type && /chol/i.test(type)) return res.json({ ok: true, type: 'Cholesterol', series: chol });
    if (type && /diab/i.test(type)) return res.json({ ok: true, type: 'Diabetes', series: diab });

    // Otherwise both (handy for dashboards)
    return res.json({ ok: true, cholesterol: chol, diabetes: diab });
  } catch (err) {
    console.error('getTimeSeries error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/** GET /api/reports/:id/compare
 *  Compares this report to the previous one (same patient & type).
 *  Returns deltas per metric for your “increase/decrease” UI.
 */
exports.compareToPrevious = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await LabReport.findById(id);
    if (!current) return res.status(404).json({ ok: false, message: 'Report not found' });

    // find the immediately previous report of the same type for the same patient
    const prev = await LabReport.findOne({
      patientId: current.patientId,
      reportType: current.reportType,
      // earlier uploadDate (fallback to createdAt if uploadDate missing)
      $or: [
        { uploadDate: { $lt: current.uploadDate || current.createdAt } },
        { createdAt: { $lt: current.uploadDate || current.createdAt } },
      ],
    }).sort({ uploadDate: -1, createdAt: -1 });

    const type = String(current.reportType || '');
    const exCur  = current.extracted || {};
    const exPrev = prev?.extracted || {};

    // choose fields by type
    const fields = /chol/i.test(type)
      ? ['totalCholesterol', 'ldl', 'hdl', 'triglycerides']
      : ['fastingGlucose', 'postPrandialGlucose', 'randomGlucose', 'ogtt2h', 'hba1c'];

    const deltas = {};
    for (const k of fields) {
      const curV  = (exCur[k]  != null) ? Number(exCur[k])  : null;
      const prevV = (exPrev[k] != null) ? Number(exPrev[k]) : null;

      // Only compute delta when we have both numbers
      const has = Number.isFinite(curV) && Number.isFinite(prevV);
      deltas[k] = {
        current: Number.isFinite(curV)  ? curV  : null,
        previous: Number.isFinite(prevV) ? prevV : null,
        delta: has ? Number((curV - prevV).toFixed(2)) : null,
        direction: has ? (curV > prevV ? 'up' : (curV < prevV ? 'down' : 'same')) : 'unknown',
      };
    }

    return res.json({
      ok: true,
      type: current.reportType,
      currentId: current._id,
      previousId: prev?._id || null,
      previousDate: prev?.uploadDate || prev?.createdAt || null,
      deltas,
      previousExtracted: prev ? prev.extracted : null,
    });
  } catch (err) {
    console.error('compareToPrevious error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};
