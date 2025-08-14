const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  packageName: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 1, min: 1 },
}, { _id: true });

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: [itemSchema],
  total: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

cartSchema.pre('save', function(next) {
  this.total = (this.items || []).reduce((s, it) => s + (Number(it.unitPrice) * Number(it.quantity)), 0);
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
