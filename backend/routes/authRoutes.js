// routes/authRoutes.js  (drop-in)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const upload = require('../middleware/upload');     // shared multer
const User = require('../models/User');
const generateUserId = require('../utils/generateUserId');

const ALLOWED_ROLES = ['Patient','Doctor','Pharmacist','HospitalManager','LabAdmin'];
const INCLUDE_TOKEN = !!process.env.JWT_SECRET;

// ---------- REGISTER ----------
router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const {
      role, firstName, lastName, nicNumber, gender, age, address,
      contactNumber, dateOfBirth, password, email,
      slmcRegistrationNumber, specialty, pharmacistId
    } = req.body;

    // OPTION A (recommended): require base fields for ALL roles (matches your friend)
    const missing = [];
    for (const [k, v] of Object.entries({
      role, firstName, lastName, nicNumber, gender, age, address,
      contactNumber, dateOfBirth, password, email
    })) if (!v && v !== 0) missing.push(k);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Role-specific
    if (role === 'Doctor') {
      if (!slmcRegistrationNumber || !/^\d{5}$/.test(slmcRegistrationNumber)) {
        return res.status(400).json({ message: 'SLMC Registration Number must be 5 digits' });
      }
      if (!specialty) {
        return res.status(400).json({ message: 'Specialty is required for Doctor' });
      }
    }
    if (role === 'Pharmacist' && !pharmacistId) {
      return res.status(400).json({ message: 'Pharmacist ID is required' });
    }

    // Uniqueness
    if (await User.findOne({ nicNumber })) return res.status(400).json({ message: 'NIC number already registered.' });
    if (await User.findOne({ email }))     return res.status(400).json({ message: 'Email already registered.' });

    // Create
    const userId = await generateUserId(role);
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = new User({
      userId,
      role,
      email,
      firstName,
      lastName,
      nicNumber,
      gender,
      age: Number(age),
      photo: req.file ? req.file.filename : undefined,   // filename only
      address,
      contactNumber,
      dateOfBirth: new Date(dateOfBirth),
      password: hashedPassword,
      ...(role === 'Doctor' ? { slmcRegistrationNumber, specialty } : {}),
      ...(role === 'Pharmacist' ? { pharmacistId } : {}),
    });

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

// ---------- LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Please enter email and password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    // optional token, but not required by rest of app
    let token;
    if (INCLUDE_TOKEN) {
      token = jwt.sign(
        { sub: user._id.toString(), role: user.role, userId: user.userId, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
    }

    res.json({
      message: 'Login successful',
      user: {
        userId: user.userId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      ...(token ? { token } : {})
    });
  } catch (error) {
    console.error('LOGIN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
