const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📁 Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 🖼 Multer setup for profile photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeUserId = req.params.userId.replace(/[\/\\]/g, '_');
    cb(null, `${safeUserId}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });


// ✅ GET all doctors — move ABOVE :userId route
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'Doctor' }).select('_id userId firstName lastName');
    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err.message);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});

// 🔍 Search doctors — move ABOVE :userId route
router.get('/search-doctors', async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 1) {
    return res.status(400).json({ message: 'Missing or empty search query' });
  }

  try {
    const doctors = await User.find({
      role: 'Doctor',
      $or: [
        { userId: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    }).select('_id userId firstName lastName');

    res.json(doctors);
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ message: 'Error searching doctors' });
  }
});

// 🔍 GET user by userId (without password)
router.get('/:userId', async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    const user = await User.findOne({ userId }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✏️ PUT update user profile
router.put('/:userId', upload.single('photo'), async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fields = [
      'firstName', 'lastName', 'email', 'nicNumber', 'gender', 'age',
      'address', 'contactNumber', 'dateOfBirth', 'specialty',
      'slmcRegistrationNumber', 'pharmacistId'
    ];
    fields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

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
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ❌ DELETE user profile
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
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
