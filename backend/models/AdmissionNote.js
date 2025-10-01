// models/AdmissionNote.js
const mongoose = require("mongoose");

function genAdmissionId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 chars
  return `AN-${y}${m}${day}-${rand}`;
}

const AdmissionNoteSchema = new mongoose.Schema(
  {
    admissionNoteId: { type: String, unique: true, index: true },  // Auto ID

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
    chiefComplaint: { type: String },           // "Chife complaint" in UI label
    preliminaryDiagnosis: { type: String },
    recommendedUnit: { type: String },          // ward/unit dropdown
    presentSymptoms: { type: String },
    examinationFindings: { type: String },
    existingConditions: { type: String },
    immediateManagements: { type: String },     // "Immediat Managements" in UI label
    emergencyCare: { type: String },            // Emergency Medical care
    doctorNotes: { type: String },
  },
  { timestamps: true }
);

AdmissionNoteSchema.pre("save", function (next) {
  if (!this.admissionNoteId) this.admissionNoteId = genAdmissionId();
  next();
});

module.exports = mongoose.model("AdmissionNote", AdmissionNoteSchema);
