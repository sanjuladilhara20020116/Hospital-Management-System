// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
<<<<<<< Updated upstream
  userId: { type: String, unique: true, required: true },
  role: {
    type: String,
    enum: ['Patient', 'Doctor', 'Pharmacist', 'HospitalManager', 'LabAdmin'], // ✅ include LabAdmin
    required: true
=======
  userId: { type: String, unique: true, required: true }, // e.g. D2025/200/123
  role: { 
    type: String, 
    enum: ['Patient', 'Doctor', 'Pharmacist', 'HospitalManager','LabAdmin'], // ✅ Fixed here
    required: true 
>>>>>>> Stashed changes
  },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  nicNumber: String,
  gender: String,
  age: Number,
  photo: String,            // store filename only
  address: String,
  contactNumber: String,
  dateOfBirth: Date,
  // Doctor-specific
  slmcRegistrationNumber: String,
  specialty: String,
  // Pharmacist-specific
  pharmacistId: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
