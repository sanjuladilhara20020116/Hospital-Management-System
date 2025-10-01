// models/DiagnosisCard.js
const mongoose = require("mongoose");

function genDiagnosisId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 chars
  return `DC-${y}${m}${day}-${rand}`;
}

const DiagnosisCardSchema = new mongoose.Schema(
  {
    diagnosisCardId: { type: String, unique: true, index: true },   // Auto ID

    // Patient (auto-fill)
    patientUserId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    age: { type: Number },

    // Doctor (auto-fill)
    doctorUserId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },

    // Date & time (auto)
    visitDateTime: { type: Date, default: Date.now, required: true },

    // Form fields
    preliminaryDiagnosis: { type: String },
    finalDiagnosis: { type: String },
    relatedSymptoms: { type: String },
    riskFactors: { type: String },      // cause / risk factors
    lifestyleAdvice: { type: String },
  },
  { timestamps: true }
);

DiagnosisCardSchema.pre("save", function (next) {
  if (!this.diagnosisCardId) this.diagnosisCardId = genDiagnosisId();
  next();
});

module.exports = mongoose.model("DiagnosisCard", DiagnosisCardSchema);
