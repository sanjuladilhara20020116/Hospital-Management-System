

const User = require('../models/User');

module.exports = async function actorDoctor(req, res, next) {
  try {
    const uid = req.headers['x-user-id'];
    if (!uid) return res.status(401).json({ message: 'Missing x-user-id header' });
    const u = await User.findOne({ userId: uid, role: 'Doctor' }).select('_id userId role');
    if (!u) return res.status(403).json({ message: 'Not a Doctor or user not found' });
    req.actorDoctor = u;
    next();
  } catch (e) {
    next(e);
  }
};
