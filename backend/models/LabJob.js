<<<<<<< Updated upstream
// models/LabJob.js
const mongoose = require('mongoose');

const labJobSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  patientId:   { type: String, required: true },
  patientRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testType:    { type: String, required: true },
  status:      { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },

  // store filename only (e.g. "1691956582_12345_report.pdf")
  reportFile:  { type: String },

  timeSlot: { type: String, enum: ['Morning','Afternoon','Evening','Night'] },
  scheduledDate: { type: Date, default: Date.now },
  completedAt:   { type: Date },

  referenceNo: { type: String, unique: true, required: true },

  // ownership
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now }
=======
// backend/models/LabJob.js
const mongoose = require('mongoose');

const labJobSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testType: {
    type: String,
    enum: ['Cholesterol', 'Diabetes', 'X-ray'], // Removed 'Other'
    required: true
  },
  assignedDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }
>>>>>>> Stashed changes
});

module.exports = mongoose.model('LabJob', labJobSchema);
