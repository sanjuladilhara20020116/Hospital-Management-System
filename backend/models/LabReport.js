// backend/models/LabReport.js
const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['Cholesterol', 'Diabetes', 'X-ray'], // Removed 'Other'
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
  // No analysis for now
});

module.exports = mongoose.model('LabReport', labReportSchema);
