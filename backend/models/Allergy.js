const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    substance: { type: String, required: true, trim: true },
    reaction:  { type: String, default: '' },
    severity:  { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Mild' },
    notedOn:   { type: Date, default: null },
    notes:     { type: String, default: '' },

    // optional audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // doctor
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Allergy', allergySchema);
