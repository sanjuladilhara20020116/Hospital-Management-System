// controllers/userController.js
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('getUserProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fields = [
      'firstName', 'lastName', 'email', 'nicNumber', 'gender', 'age',
      'address', 'contactNumber', 'dateOfBirth', 'specialty',
      'slmcRegistrationNumber', 'pharmacistId'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = field === 'age' ? Number(req.body[field]) : req.body[field];
      }
    });

    // Photo
    if (req.file) {
      if (user.photo) {
        const oldPath = path.join(__dirname, '..', 'uploads', user.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.photo = req.file.filename; // ✅ filename only
    }

    await user.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateUserProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.photo) {
      const photoPath = path.join(__dirname, '..', 'uploads', user.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await user.remove();
    res.json({ message: 'User profile deleted successfully' });
  } catch (err) {
    console.error('deleteUserProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
