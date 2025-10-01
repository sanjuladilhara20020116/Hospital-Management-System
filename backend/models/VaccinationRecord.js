// backend/models/VaccinationRecord.js
const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema(
  {
    // Links
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Vaccine details
    vaccineName:   { type: String, required: true },      // e.g., "Hepatitis B"
    manufacturer:  { type: String },                      // optional
    batchLotNo:    { type: String, required: true },
    expiryDate:    { type: Date },                        // optional
    doseNumber:    { type: Number, default: 1 },          // 1, 2, booster
    route:         { type: String, default: 'IM' },       // IM/SC
    site:          { type: String, default: 'Left Deltoid' },
    dateAdministered: { type: Date, default: () => new Date() },
    notes:         { type: String },

    // Certificate
    certificateNumber: { type: String, required: true, unique: true, index: true },
    certificatePdfFile: { type: String }, // relative path under uploads/, e.g. "vaccination-certificates/VAC-20250821-ABCD.pdf"
    issuedAt: { type: Date },
    emailedAt: { type: Date },

    // Governance
    voided: { type: Boolean, default: false },
    voidReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);
