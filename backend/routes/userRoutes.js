const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeUserId = req.params.userId.replace(/[\/\\]/g, '_'); // avoid slashes
    cb(null, `${safeUserId}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// GET user by userId
router.get('/:userId', async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    const user = await User.findOne({ userId }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update user profile with optional photo upload
router.put('/:userId', upload.single('photo'), async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields from body
    const fields = [
      'firstName', 'lastName', 'email', 'nicNumber', 'gender', 'age',
      'address', 'contactNumber', 'dateOfBirth', 'specialty',
      'slmcRegistrationNumber', 'pharmacistId'
    ];
    fields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    // Handle photo upload
    if (req.file) {
      if (user.photo) {
        const oldPhotoPath = path.join(uploadsDir, user.photo);
        if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
      }
      user.photo = req.file.filename;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user profile
router.delete('/:userId', async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.photo) {
      const photoPath = path.join(uploadsDir, user.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await user.remove();
    res.json({ message: 'User profile deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
