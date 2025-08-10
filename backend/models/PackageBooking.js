// models/PackageBooking.js
const mongoose = require('mongoose');

const bookedItemSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  packageName: String,
  unitPrice: Number,
  quantity: Number
});

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  patientEmail: { type: String, required: true },
  patientName: String,
  items: [bookedItemSchema],
  totalAmount: Number,
  appointmentDate: { type: Date, required: true },
  payment: {
    method: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
    transactionId: String
  },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PackageBooking', bookingSchema);
