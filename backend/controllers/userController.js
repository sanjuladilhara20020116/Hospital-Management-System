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

/* ----------------------------------------------------------
 * Dev-only auth stubs (NO JWT) so routes can use protect/allowRoles
 * Send headers from frontend when needed:
 *   - X-Role: Patient | Doctor | Pharmacist | HospitalManager | LabAdmin
 *   - X-User-Id: e.g. P2025/001
 * ---------------------------------------------------------- */
exports.protect = (req, _res, next) => {
  const role = (req.headers['x-role'] || 'Patient').toString();
  const userId = (req.headers['x-user-id'] || '').toString();
  req.user = { role, userId };
  next();
};

exports.allowRoles = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// optional alias if some routes import authorizeRoles
exports.authorizeRoles = exports.allowRoles;
