
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

/* 👇 NEW (optional) — used to mark “new vs downloaded” for the portal */
  downloads: [{
    when: { type: Date, default: Date.now }, // when this user downloaded
    by:   { type: String, default: 'public' } // patientId (e.g. P2025/123/13) or 'public'
  }],
  firstDownloadedAt: { type: Date }, // first ever download timestamp



  // ownership
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabJob', labJobSchema);