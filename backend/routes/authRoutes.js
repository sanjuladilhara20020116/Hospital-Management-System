// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const upload = require('../middleware/upload');       // ✅ use shared upload
const User = require('../models/User');
const generateUserId = require('../utils/generateUserId');

const ALLOWED_ROLES = ['Patient', 'Doctor', 'Pharmacist', 'HospitalManager', 'LabAdmin'];

router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const {
      role, firstName, lastName, nicNumber, gender, age, address,
      contactNumber, dateOfBirth, password, email,
      slmcRegistrationNumber, specialty, pharmacistId
    } = req.body;

    // Basic required checks (email explicitly mentioned in your message)
    const missing = [];
    for (const [k, v] of Object.entries({ role, firstName, lastName, nicNumber, gender, age, address, contactNumber, dateOfBirth, password, email })) {
      if (!v && v !== 0) missing.push(k);
    }
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Role-specific checks
    if (role === 'Doctor') {
      if (!slmcRegistrationNumber || !/^\d{5}$/.test(slmcRegistrationNumber)) {
        return res.status(400).json({ message: 'SLMC Registration Number must be 5 digits' });
      }
      if (!specialty) {
        return res.status(400).json({ message: 'Specialty is required for Doctor' });
      }
    }
    if (role === 'Pharmacist') {
      if (!pharmacistId) return res.status(400).json({ message: 'Pharmacist ID is required' });
    }
    // LabAdmin: no extra required fields currently

    // Uniqueness checks
    const existingUserNic = await User.findOne({ nicNumber });
    if (existingUserNic) return res.status(400).json({ message: 'NIC number already registered.' });

    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) return res.status(400).json({ message: 'Email already registered.' });

    // Generate ID + hash password
    const userId = await generateUserId(role);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      userId,
      role,
      email,
      firstName,
      lastName,
      nicNumber,
      gender,
      age: Number(age),
      photo: req.file ? req.file.filename : undefined, // ✅ filename only
      address,
      contactNumber,
      dateOfBirth: new Date(dateOfBirth),
      password: hashedPassword,
    });

    if (role === 'Doctor') {
      newUser.slmcRegistrationNumber = slmcRegistrationNumber;
      newUser.specialty = specialty;
    }
    if (role === 'Pharmacist') {
      newUser.pharmacistId = pharmacistId;
    }

    await newUser.save();
    return res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate field value', details: error.keyValue });
    }
    console.error('REGISTER error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Please enter email and password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await require('bcryptjs').compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user: {
        userId: user.userId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('LOGIN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
