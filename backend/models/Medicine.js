// models/Medicine.js
const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'units' }, // tablets, vials, etc.
  expiryDate: { type: Date, required: true },
  unitPrice: { type: Number, required: true, min: 0 }, // optional but handy
  receivedAt: { type: Date, default: Date.now },
  supplierName: String, // convenience field
});

const medicineSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., SKU
  name: { type: String, required: true, index: true },
  form: { type: String, enum: ['tablet','capsule','syrup','injection','cream','other'], default: 'other' },
  strength: String, // e.g., "500 mg"
  reorderLevel: { type: Number, default: 0 }, // low-stock threshold across batches
  batches: [batchSchema],
  createdAt: { type: Date, default: Date.now }
});

// Virtual: total stock across all batches
medicineSchema.virtual('totalQty').get(function() {
  return this.batches.reduce((sum, b) => sum + b.qty, 0);
});

// Helpful index for near-expiry queries
medicineSchema.index({ 'batches.expiryDate': 1 });

module.exports = mongoose.model('Medicine', medicineSchema);

