// models/ClinicalRecord.js
const mongoose = require("mongoose");

function genRecordId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 chars
  return `REC-${y}${m}${day}-${rand}`;
}

const ClinicalRecordSchema = new mongoose.Schema(
  {
    // Auto-generated business id (human-friendly)
    recordId: { type: String, unique: true, index: true },

    // Patient (auto-fill)
    patientUserId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    age: { type: Number },
    gender: { type: String },

    // Doctor (auto-fill)
    doctorUserId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },

    // Visit date-time (auto-fill at create)
    visitDateTime: { type: Date, default: Date.now, required: true },

    // Form fields
    chiefComplaint: { type: String },
    presentSymptoms: { type: String },
    examination: { type: String },
    assessment: { type: String },
    instructions: { type: String },
    vitalSigns: { type: String },
    doctorNotes: { type: String },
  },
  { timestamps: true }
);

ClinicalRecordSchema.pre("save", function (next) {
  if (!this.recordId) this.recordId = genRecordId();
  next();
});

module.exports = mongoose.model("ClinicalRecord", ClinicalRecordSchema);
