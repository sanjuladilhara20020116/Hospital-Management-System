// backend/controllers/diabetesController.js
const fs = require('fs');
const path = require('path');

const LabReport = require('../models/LabReport');
const { extractDiabetesFromFile } = require('../services/diabetesExtractor');

const ensureAbsolute = (p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p));

/**
 * Preview Diabetes extraction (NO DB WRITE).
 * GET/POST /api/diabetes/:id/preview
 * GET/POST /api/reports/:id/diabetes/preview  (alias)
 */
exports.preview = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Report not found' });

    const abs = ensureAbsolute(doc.filePath || '');
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ ok: false, message: 'Report file missing on disk' });
    }

    const parsed = await extractDiabetesFromFile(abs);
    return res.json({ ok: true, parsed });
  } catch (err) {
    // Mirror mini-project style errors
    return res.status(500).json({ ok: false, message: err.message || 'Extraction failed' });
  }
};

/**
 * Analyze & SAVE Diabetes-only fields into LabReport (optional).
 * POST /api/diabetes/:id/analyze
 */
exports.analyzeAndSave = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LabReport.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Report not found' });

    const abs = ensureAbsolute(doc.filePath || '');
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ ok: false, message: 'Report file missing on disk' });
    }

    const parsed = await extractDiabetesFromFile(abs);

    // Save ONLY diabetes fields (no cholesterol mixing)
    const payload = {
      extracted: {
        ...(doc.extracted || {}),
        testDate:            parsed.testDate || null,
        labName:             parsed.labName || '',
        patientNameOnReport: parsed.patientName || '',

        glucoseUnits: parsed?.units?.glucose || 'mg/dL',
        hba1cUnits:   parsed?.units?.hba1c   || '%',

        fastingGlucose:      parsed.fastingGlucose ?? null,
        postPrandialGlucose: parsed.ppGlucose ?? null,
        randomGlucose:       parsed.randomGlucose ?? null,
        ogtt2h:              parsed.ogtt_2hr ?? null,
        hba1c:               parsed.hba1c ?? null,

        // optional: keep notes
        notes: parsed.notes || (doc.extracted?.notes || ''),
      },
      // leave analysis empty so FE only displays extracted values (your request)
      analysis: doc.analysis || {},
      isAnalyzed: true,
      analyzedAt: new Date(),
    };

    const updated = await LabReport.findByIdAndUpdate(doc._id, { $set: payload }, { new: true });
    return res.json({ ok: true, report: updated, parsed });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || 'Analyze failed' });
  }
};
