// backend/models/LabReport.js
const mongoose = require('mongoose');

const ExtractedValuesSchema = new mongoose.Schema({
  // common
  testDate: String,
  labName: String,
  patientNameOnReport: String,
  notes: String,

  // ---- Cholesterol (existing) ----
  totalCholesterol: Number,
  ldl: Number,
  hdl: Number,
  triglycerides: Number,
  units: { type: String, default: 'mg/dL' }, // cholesterol units

  // ---- Diabetes (new, all optional; SAFE additions) ----
  fastingGlucose: Number,          // mg/dL or mmol/L
  postPrandialGlucose: Number,     // 2-hr PP
  randomGlucose: Number,           // RBS
  ogtt2h: Number,                  // 2-hr OGTT
  hba1c: Number,                   // %
  glucoseUnits: String,            // 'mg/dL' | 'mmol/L'
  hba1cUnits: { type: String, default: '%' },
}, { _id: false });

const labReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, enum: ['Cholesterol', 'Diabetes', 'X-ray'], required: true, index: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },

  isAnalyzed: { type: Boolean, default: false },
  analyzedAt: Date,

  // 👇 allow extracted fields for ANY test type (cholesterol OR diabetes)
  extracted: { type: mongoose.Schema.Types.Mixed, default: {} },

  // already Mixed so we can keep both legacy/new shapes
  analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

/**
 * Auto-adapt legacy cholesterol analysis shape -> new UI bucket shape when serializing.
 * (Unchanged; it only touches cholesterol legacy docs. Diabetes uses the new shape directly.)
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
      const toCategory = (s = '') => {
        const t = String(s).toLowerCase();
        if (!t || t.includes('unknown')) return 'unknown';
        if (t.includes('optimal') || t.includes('protective') || t.includes('desirable') || t.includes('normal') || t.includes('good')) return 'good';
        if (t.includes('near') || t.includes('borderline')) return 'moderate';
        if (t.includes('high')) return 'bad';
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

labReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.LabReport || mongoose.model('LabReport', labReportSchema);
