// models/Ward.js
const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema({
  wardName: { type: String, required: true },
  wardType: { type: String, required: true },
  capacity: { type: Number, required: true },
  assignedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('Ward', WardSchema);
