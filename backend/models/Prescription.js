
// models/Prescription.js
const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  medicineCode: { type: String, required: true },
  dose: String, // e.g., "1 tab"
  frequency: String, // e.g., "TID"
  durationDays: Number,
  qty: { type: Number, required: true, min: 1 },
});

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: String, required: true },  // adapt to your patient model
  doctorId: { type: String, required: true },   // adapt to your user/doctor model
  items: [itemSchema],
  status: { type: String, enum: ['NEW','PARTIAL','DISPENSED','CANCELLED'], default: 'NEW' },
  createdAt: { type: Date, default: Date.now },
  dispensedAt: Date
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
