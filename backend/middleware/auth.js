<<<<<<< Updated upstream
const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  try {
    const hdr = req.headers.authorization || '';
    const [, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Attach minimal user context
    req.user = {
      _id: payload.sub,
      role: payload.role,
      userId: payload.userId,
      email: payload.email,
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
=======
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Verify JWT token
exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains id and role
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Check if user is Lab Admin
exports.isLabAdmin = (req, res, next) => {
  if (req.user.role === 'LabAdmin') return next(); // Capitalized
  return res.status(403).json({ message: "Access denied: Lab Admin only" });
};

exports.isDoctorOrPatient = (req, res, next) => {
  const role = req.user.role;
  if (role === 'Doctor' || role === 'Patient') return next(); // Capitalized
  return res.status(403).json({ message: "Access denied: Doctor or Patient only" });
};

>>>>>>> Stashed changes
