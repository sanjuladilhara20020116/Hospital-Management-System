const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema({
  wardName: { type: String, required: true, trim: true },
  wardType: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Ward', WardSchema);
