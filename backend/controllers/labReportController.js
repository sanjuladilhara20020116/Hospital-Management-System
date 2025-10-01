// backend/controllers/labReportController.js
const fs = require('fs');
const path = require('path');

const LabReport = require('../models/LabReport');
const LabJob    = require('../models/LabJob');
const saveCholesterolSnapshot = require('../utils/saveCholesterolSnapshot');

// Cholesterol utilities (existing)
const { extractFromReport, analyzeValues } = require('../utils/aiExtract');

// Hand off Diabetes work to a separate controller
const diabetesCtrl = require('./diabetesController');

/* ------------------------------ helpers ---------------------------------- */
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

/* ---------------- Oldest-un-analyzed gate (shared helper) ---------------- */
async function blockIfOlderUnanalyzedExists(reportDoc) {
  const older = await LabReport.findOne({
    patientId: reportDoc.patientId,
    reportType: reportDoc.reportType,
    isAnalyzed: { $ne: true },
    $or: [
      { uploadDate: { $lt: reportDoc.uploadDate || reportDoc.createdAt } },
      { createdAt:  { $lt: reportDoc.uploadDate || reportDoc.createdAt } },
    ],
  }).sort({ uploadDate: 1, createdAt: 1 }); // oldest first

  return older || null;
}

/* --------------------------------- CRUD ---------------------------------- */
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
    const { patientId, reportType, referenceNo } = req.body; // referenceNo is optional but preferred
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // 1) create the report first
    const report = await LabReport.create({
      patientId,
      reportType,
      filePath: file.path,
      uploadDate: new Date(),
      // referenceNo will be filled in below if we can link a LabJob
    });

    // 2) try to link a pending LabJob and mark it completed
    const jobFilter = referenceNo
      ? { referenceNo }
      : { patientId, testType: reportType, status: 'Pending' };

    const job = await LabJob.findOneAndUpdate(
      jobFilter,
      { status: 'Completed', reportFile: file.path, completedAt: new Date() },
      { new: true }
    );

    // 3) if a job was found, copy its referenceNo onto the report
    if (job?.referenceNo) {
      report.referenceNo = job.referenceNo;
      await report.save();
    }

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

/* ------------------------ ANALYZE BY REPORT _id -------------------------- */
exports.analyzeReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await LabReport.findById(id);
    if (!report) return res.status(404).json({ ok: false, message: 'Report not found' });

    // enforce oldest-first if required
    const blocker = await blockIfOlderUnanalyzedExists(report);
    if (blocker) {
      return res.status(412).json({
        ok: false,
        code: 'OLDER_UNANALYZED_EXISTS',
        message: 'You must analyze older reports first.',
        nextId: blocker._id,
        nextDate: blocker.uploadDate || blocker.createdAt,
      });
    }

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

    // ---- Cholesterol path ----
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

    await saveCholesterolSnapshot(updated); // writes/updates the snapshot + enforces last-5

    return res.json({ ok: true, reportId: updated._id, report: updated });
  } catch (err) {
    console.error('analyzeReport error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

/* ------------------------------ GET ONE ---------------------------------- */
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const dbDoc = await LabReport.findById(id).populate('patientId', '_id userId firstName lastName');
    if (!dbDoc) return res.status(404).json({ ok: false, message: 'Not found' });

    const r = dbDoc.toObject();
    const a = r.analysis || {};

    // migrate legacy flat statuses to bucketed fields (back-compat)
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

// near the other helpers
// helpers (one copy only)
// --- keep exactly one copy of these helpers near the top ---



const sendInlineFile = (res, absPath, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename || absPath)}"`);
  return res.sendFile(absPath);
};


// /api/reports/:id/view
// keep your existing helpers at the top: isObjectId, ensureAbsolute, sendInlineFile

exports.viewReportFile = async (req, res) => {
  try {
    const { id } = req.params;

    // If it's not a valid ObjectId, treat it as referenceNo
    if (!isObjectId(id)) {
      // First try a LabReport that already exists with this referenceNo
      const byRefReport = await LabReport.findOne({ referenceNo: id });
      if (byRefReport) {
        const abs = ensureAbsolute(byRefReport.filePath || '');
        if (!abs || !fs.existsSync(abs)) {
          return res.status(404).json({ ok:false, message: 'Report file missing' });
        }
        return sendInlineFile(res, abs, `report-${byRefReport.referenceNo}.pdf`);
      }

      // Fallback: if no LabReport row, try the LabJob reference flow
      req.params.referenceNo = id; // reuse your existing handler
      return exports.viewByReferenceFile(req, res);
    }

    // Normal path: treat as ObjectId
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok:false, message: 'Report not found' });

    const abs = ensureAbsolute(doc.filePath || '');
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ ok:false, message: 'Report file missing' });
    }
    return sendInlineFile(res, abs, `report-${doc.referenceNo || doc._id}.pdf`);
  } catch (e) {
    return res.status(500).json({ ok:false, message: e.message });
  }
};


// /api/reports/by-ref/:referenceNo/view
exports.viewByReferenceFile = async (req, res) => {
  const { referenceNo } = req.params;
  const job = await LabJob.findOne({ referenceNo, status: 'Completed' });
  if (!job || !job.reportFile) return res.status(404).json({ ok:false, message: 'Report not found for reference' });
  const abs = path.isAbsolute(job.reportFile) ? job.reportFile : path.join(uploadsDir, job.reportFile);
  if (!fs.existsSync(abs)) return res.status(404).json({ ok:false, message: 'Report file missing on disk' });
  return sendInlineFile(res, abs, `report-${referenceNo}.pdf`);
};



/* ---------------------- ANALYZE BY REFERENCE (LB-...) --------------------- */
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
      referenceNo: job.referenceNo,
    };
    const report = await LabReport.findOneAndUpdate(
      { patientId: job.patientRef, reportType: job.testType, filePath: abs },
      { $setOnInsert: base },
      { new: true, upsert: true }
    );

    // enforce oldest-first before doing work
    const blocker = await blockIfOlderUnanalyzedExists(report);
    if (blocker) {
      return res.status(412).json({
        ok: false,
        code: 'OLDER_UNANALYZED_EXISTS',
        message: 'You must analyze older reports first.',
        nextId: blocker._id,
        nextDate: blocker.uploadDate || blocker.createdAt,
      });
    }

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

    await saveCholesterolSnapshot(updated); // writes/updates the snapshot + enforces last-5

    return res.json({ ok: true, reportId: updated._id, report: updated });
  } catch (err) {
    console.error('analyzeByReference error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/* ---------------------------- GET BY REFERENCE ---------------------------- */
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

/* --------------------------- /api/analyze (key) --------------------------- */
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

/* ---------------------------- AI Coach / Advice --------------------------- */
exports.getAdvice = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: "Report not found" });

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ ok: false, message: "Advice unavailable: missing OPENROUTER_API_KEY" });
    }

    const r = doc.toObject();
    const ex = r.extracted || {};
    const type = String(r.reportType || "").toLowerCase();

    // ------- Build compact, value-centric payload for GPT -------
    let input;
    if (type.includes("chol")) {
      input = {
        kind: "cholesterol",
        units: ex.units || "mg/dL",
        totalCholesterol: ex.totalCholesterol ?? null,
        ldl: ex.ldl ?? null,
        hdl: ex.hdl ?? null,
        triglycerides: ex.triglycerides ?? null,
        testDate: ex.testDate || null,
        labName: ex.labName || null,
      };
    } else if (type.includes("diab")) {
      // Normalize glucose into mg/dL so the model can reason cleanly
      const gUnit = ex.glucoseUnits || "mg/dL";
      const toMgDl = (v) => (v == null ? null : (gUnit === "mmol/L" ? Number(v) * 18 : Number(v)));

      const fasting   = toMgDl(ex.fastingGlucose);
      const pp2h      = toMgDl(ex.postPrandialGlucose ?? ex.ogtt2h);
      const random    = toMgDl(ex.randomGlucose);
      const a1c       = ex.hba1c != null ? Number(ex.hba1c) : null;

      const classify = {
        fasting(v){ if (v==null) return "unknown"; if (v>=126) return "Diabetes"; if (v>=100) return "Prediabetes"; return "Normal"; },
        pp2h(v){    if (v==null) return "unknown"; if (v>=200) return "Diabetes"; if (v>=140) return "Prediabetes"; return "Normal"; },
        random(v){  if (v==null) return "unknown"; if (v>=200) return "Diabetes"; if (v>=140) return "Prediabetes"; return "Normal"; },
        a1c(p){     if (p==null) return "unknown"; if (p>=6.5)  return "Diabetes"; if (p>=5.7)  return "Prediabetes"; return "Normal"; },
      };

      input = {
        kind: "diabetes",
        units: { glucose: gUnit, hba1c: ex.hba1cUnits || "%" },
        valuesMgDl: { fasting, postPrandial: pp2h, random, hba1c: a1c },
        statuses: {
          fasting: classify.fasting(fasting),
          postPrandial: classify.pp2h(pp2h),
          random: classify.random(random),
          hba1c: classify.a1c(a1c),
        },
        raw: {
          fastingGlucose: ex.fastingGlucose ?? null,
          postPrandialGlucose: ex.postPrandialGlucose ?? null,
          ogtt2h: ex.ogtt2h ?? null,
          randomGlucose: ex.randomGlucose ?? null,
          hba1c: ex.hba1c ?? null,
        },
        testDate: ex.testDate || null,
        labName: ex.labName || null,
      };
    } else {
      return res.status(400).json({ ok: false, message: "Unsupported report type for advice" });
    }

    const SYSTEM = `
You are a non-diagnostic health coach. Use the provided numeric values to infer plausible contributing factors and practical, safe next steps.
Do NOT just restate statuses like "LDL is high"—give likely reasons (diet patterns, lifestyle, common conditions/meds) and targeted, realistic recommendations.
Keep it short, specific, and actionable. No medication changes. Avoid alarmist tone.

Return JSON ONLY (no markdown) with this schema; omit empty keys:
{
  "healthStatus": string,
  "reasons": string[],
  "recommendations": string[],
  "breakdown": { "...": string },
  "disclaimer": string
}`.trim();

    const MODEL = (typeof TEXT_MODEL !== "undefined" && TEXT_MODEL) ? TEXT_MODEL : "openai/gpt-4o-mini";
    const USER = `INPUT: ${JSON.stringify(input)}`;

    const content = await callOpenRouterJSON({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: USER }
      ],
      temperature: 0.3
    });

    const parsed = safeParseJSON(content) || {};
    const advice = {
      healthStatus: parsed.healthStatus || (type.includes("chol") ? "Lipid profile reviewed." : "Glucose profile reviewed."),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      breakdown: (parsed.breakdown && typeof parsed.breakdown === "object") ? parsed.breakdown : {},
      disclaimer: parsed.disclaimer || "This is general information, not a medical diagnosis. Please consult your clinician."
    };

    return res.json({ ok: true, advice });
  } catch (err) {
    console.error("getAdvice error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/* --------------------------- Extract Preview (RO) -------------------------- */
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

    // If Diabetes → forward to diabetes preview
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

/* -------------------- TIME SERIES & COMPARE (for charts) ------------------- */
function _snapshot(report) {
  const ex = report?.extracted || {};
  const type = String(report?.reportType || '');
  const snap = { date: report?.uploadDate || report?.createdAt || null };

  if (/chol/i.test(type)) {
    if (ex.totalCholesterol != null) snap.totalCholesterol = Number(ex.totalCholesterol);
    if (ex.ldl != null)             snap.ldl = Number(ex.ldl);
    if (ex.hdl != null)             snap.hdl = Number(ex.hdl);
    if (ex.triglycerides != null)   snap.triglycerides = Number(ex.triglycerides);
  } else if (/diab/i.test(type)) {
    if (ex.fastingGlucose != null)      snap.fastingGlucose = Number(ex.fastingGlucose);
    if (ex.postPrandialGlucose != null) snap.postPrandialGlucose = Number(ex.postPrandialGlucose);
    if (ex.randomGlucose != null)       snap.randomGlucose = Number(ex.randomGlucose);
    if (ex.ogtt2h != null)              snap.ogtt2h = Number(ex.ogtt2h);
    if (ex.hba1c != null)               snap.hba1c = Number(ex.hba1c);
  }

  return snap;
}

/** GET /api/patients/:patientId/series?type=Cholesterol|Diabetes */
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

    if (type && /chol/i.test(type)) return res.json({ ok: true, type: 'Cholesterol', series: chol });
    if (type && /diab/i.test(type)) return res.json({ ok: true, type: 'Diabetes', series: diab });

    return res.json({ ok: true, cholesterol: chol, diabetes: diab });
  } catch (err) {
    console.error('getTimeSeries error:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/** GET /api/reports/:id/compare */
exports.compareToPrevious = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await LabReport.findById(id);
    if (!current) return res.status(404).json({ ok: false, message: 'Report not found' });

    const prev = await LabReport.findOne({
      patientId: current.patientId,
      reportType: current.reportType,
      $or: [
        { uploadDate: { $lt: current.uploadDate || current.createdAt } },
        { createdAt: { $lt: current.uploadDate || current.createdAt } },
      ],
    }).sort({ uploadDate: -1, createdAt: -1 });

    const type = String(current.reportType || '');
    const exCur  = current.extracted || {};
    const exPrev = prev?.extracted || {};

    const fields = /chol/i.test(type)
      ? ['totalCholesterol', 'ldl', 'hdl', 'triglycerides']
      : ['fastingGlucose', 'postPrandialGlucose', 'randomGlucose', 'ogtt2h', 'hba1c'];

    const deltas = {};
    for (const k of fields) {
      const curV  = (exCur[k]  != null) ? Number(exCur[k])  : null;
      const prevV = (exPrev[k] != null) ? Number(exPrev[k]) : null;

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
