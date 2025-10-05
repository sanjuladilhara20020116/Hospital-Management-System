

const User = require('../models/User');

// Reads x-user-id and resolves a Patient user
module.exports = async function actorPatient(req, res, next) {
  try {
    const uid = req.headers['x-user-id'];
    if (!uid) return res.status(401).json({ message: 'Missing x-user-id header' });
    const u = await User.findOne({ userId: uid, role: 'Patient' }).select('_id userId role');
    if (!u) return res.status(403).json({ message: 'Not a Patient or user not found' });
    req.actorPatient = u;
    next();
  } catch (e) {
    next(e);
  }
};
