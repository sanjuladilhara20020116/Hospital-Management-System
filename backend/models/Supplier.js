const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  price: { type: Number }, // auto-calculated
  date: { type: Date, default: Date.now }
});

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contactPerson: String,
  phone: String,
  email: String,
  address: String,
  items: [itemSchema],
  totalPrice: { type: Number, default: 0 }, // auto-calculated
  createdAt: { type: Date, default: Date.now }
});

// Calculate price and totalPrice before saving
supplierSchema.pre('save', function (next) {
  this.items.forEach(item => {
    item.price = item.unitPrice * item.quantity;
  });
  this.totalPrice = this.items.reduce((sum, item) => sum + item.price, 0);
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
