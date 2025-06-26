const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateUserId = require('../utils/generateUserId');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Registration route
router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const {
      role,
      firstName, lastName, nicNumber, gender, age, address,
      contactNumber, dateOfBirth, password, email,
      slmcRegistrationNumber, specialty, pharmacistId
    } = req.body;

    if (!role || !firstName || !lastName || !nicNumber || !gender || !age || !address || !contactNumber || !dateOfBirth || !password || !email) {
      return res.status(400).json({ message: 'Please fill all required fields including email.' });
    }

    // Check for existing NIC and Email
    const existingUserNic = await User.findOne({ nicNumber });
    if (existingUserNic) {
      return res.status(400).json({ message: 'NIC number already registered.' });
    }

    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const userId = await generateUserId(role);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const photoPath = req.file ? req.file.path : null;

    const newUser = new User({
      userId,
      role,
      email,
      firstName,
      lastName,
      nicNumber,
      gender,
      age,
      photo: photoPath,
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

    res.status(201).json({ message: 'User registered successfully', userId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
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
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
