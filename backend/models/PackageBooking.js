// models/PackageBooking.js
const mongoose = require('mongoose');

const bookedItemSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  packageName: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
  status: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  transactionId: String,

  // Safe card metadata only (no PAN/CVV stored)
  cardBrand: String,         // 'VISA' | 'MASTERCARD' | 'AMEX' | etc.
  cardLast4: String,         // '1234'
  cardExpMonth: Number,      // 1-12
  cardExpYear: Number,       // 4-digit year
  cardHolder: String
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  patientEmail: { type: String, required: true },
  patientName: String,

  items: { type: [bookedItemSchema], default: [] },
  totalAmount: { type: Number, required: true, min: 0 },

  appointmentDate: { type: Date, required: true, index: true },

  payment: { type: paymentSchema, default: () => ({}) },

  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED', index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Optional: ensure at least one item
bookingSchema.path('items').validate(arr => Array.isArray(arr) && arr.length > 0, 'At least one item is required');

module.exports = mongoose.model('PackageBooking', bookingSchema);
