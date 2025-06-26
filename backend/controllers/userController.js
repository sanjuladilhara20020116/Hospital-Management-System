
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields
    const fields = [
      'firstName', 'lastName', 'email', 'nicNumber', 'gender', 'age',
      'address', 'contactNumber', 'dateOfBirth', 'specialty', 
      'slmcRegistrationNumber', 'pharmacistId'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle photo upload if exists
    if (req.file) {
      // Delete old photo file if exists
      if (user.photo) {
        const oldPath = path.join(__dirname, '..', 'uploads', user.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.photo = req.file.filename;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete photo file if exists
    if (user.photo) {
      const photoPath = path.join(__dirname, '..', 'uploads', user.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await user.remove();
    res.json({ message: 'User profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
