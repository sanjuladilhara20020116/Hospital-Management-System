// models/Prescription.js
const mongoose = require("mongoose");

function genPrescriptionId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 chars
  return `PRN-${y}${m}${day}-${rand}`;
}

const PrescriptionSchema = new mongoose.Schema(
  {
    // Auto-generated, human-friendly ID
    prescriptionId: { type: String, unique: true, index: true },

    // Patient (auto-fill)
    patientUserId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    age: { type: Number },

    // Doctor (auto-fill)
    doctorUserId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },

    // Date & time (auto at create)
    visitDateTime: { type: Date, default: Date.now, required: true },

    // Form fields
    chiefComplaint: { type: String },
    medicines: { type: String },              // Medicine name and dosage (multi-line)
    instructions: { type: String },
    duration: { type: String },
    requestedLabReports: { type: String },
  },
  { timestamps: true }
);

PrescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionId) this.prescriptionId = genPrescriptionId();
  next();
});

module.exports = mongoose.model("Prescription", PrescriptionSchema);
