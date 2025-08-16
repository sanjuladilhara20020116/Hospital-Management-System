// backend/models/LabReport.js
const mongoose = require('mongoose');

const ExtractedValuesSchema = new mongoose.Schema({
  testDate: String,
  labName: String,
  patientNameOnReport: String,
  totalCholesterol: Number,
  ldl: Number,
  hdl: Number,
  triglycerides: Number,
  units: { type: String, default: 'mg/dL' },
  notes: String,
}, { _id: false });

/**
 * NOTE: We keep the legacy AnalysisSchema here ONLY for reference.
 * We no longer *use* it on the model, because we want to store either the legacy
 * shape OR the new bucket shape. Using Mixed allows both.
 */
// const AnalysisSchema = new mongoose.Schema({
//   ldlStatus: String,
//   hdlStatus: String,
//   triglycerideStatus: String,
//   totalCholesterolStatus: String,
//   summary: String,
//   tips: [String],
// }, { _id: false });

const labReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, enum: ['Cholesterol', 'Diabetes', 'X-ray'], required: true, index: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },

  isAnalyzed: { type: Boolean, default: false },
  analyzedAt: Date,
  extracted: ExtractedValuesSchema,

  // IMPORTANT: allow any JSON here so we can store BOTH old and new shapes safely.
  analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

/**
 * Auto-adapt legacy analysis shape -> new UI bucket shape when serializing.
 * This means existing documents that still have { ldlStatus, ... } will
 * appear to the frontend in the structure it expects, without a migration.
 */
labReportSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    const a = ret.analysis || {};
    const hasLegacy =
      a && typeof a === 'object' &&
      ('ldlStatus' in a || 'hdlStatus' in a || 'triglycerideStatus' in a || 'totalCholesterolStatus' in a);

    const missingBuckets =
      !a || !a.ldl || !a.hdl || !a.triglycerides || !a.totalCholesterol;

    if (hasLegacy && missingBuckets) {
      // Map legacy statuses -> UI categories
      const toCategory = (s = '') => {
        const t = String(s).toLowerCase();
        if (!t || t.includes('unknown')) return 'unknown';
        if (t.includes('optimal') || t.includes('protective') || t.includes('desirable') || t.includes('normal') || t.includes('good')) return 'good';
        if (t.includes('near') || t.includes('borderline')) return 'moderate';
        if (t.includes('high')) return 'bad'; // covers "high" and "very high"
        return 'unknown';
      };

      const refs = {
        ldl:   'LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190',
        hdl:   'HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60',
        tg:    'Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500',
        total: 'Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240',
      };

      const ex = ret.extracted || {};
      ret.analysis = {
        ldl: { value: ex.ldl ?? null, category: toCategory(a.ldlStatus), reference: refs.ldl },
        hdl: { value: ex.hdl ?? null, category: toCategory(a.hdlStatus), reference: refs.hdl },
        triglycerides: { value: ex.triglycerides ?? null, category: toCategory(a.triglycerideStatus), reference: refs.tg },
        totalCholesterol: { value: ex.totalCholesterol ?? null, category: toCategory(a.totalCholesterolStatus), reference: refs.total },
        notes: a.summary || '',
        nextSteps: Array.isArray(a.tips) ? a.tips : [],
      };
    }

    return ret;
  }
});

// If you ever need the same behavior for toObject():
labReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.LabReport || mongoose.model('LabReport', labReportSchema);
