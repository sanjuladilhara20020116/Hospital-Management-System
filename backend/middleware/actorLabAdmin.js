// middleware/actorLabAdmin.js
const User = require('../models/User');

// Resolve Lab Admin from header or body. No JWT used.
module.exports = async function actorLabAdmin(req, res, next) {
  try {
    const actorUserId =
      req.headers['x-user-id'] ||
      req.body?.actorUserId ||
      req.query?.actorUserId;

    if (!actorUserId) {
      return res.status(401).json({ message: 'Missing Lab Admin identity (x-user-id or actorUserId)' });
    }

    const user = await User.findOne({ userId: actorUserId });
    if (!user) return res.status(401).json({ message: 'Actor user not found' });
    if (user.role !== 'LabAdmin') return res.status(403).json({ message: 'Only Lab Admins can perform this action' });

    // attach both user doc and its ObjectId for convenience
    req.actorLabAdmin = user;
    req.actorLabAdminId = user._id;
    next();
  } catch (e) {
    next(e);
  }
};
