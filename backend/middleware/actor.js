// Simple, no-JWT "actor" from x-user-id header
const User = require('../models/User');

async function actorFromHeader(req, _res, next) {
  try {
    const raw = req.headers['x-user-id'];
    if (!raw) return next(); // unauthenticated => req.user stays undefined
    const u = await User.findOne({ userId: raw }).lean();
    if (u) req.user = { ...u, _id: u._id, id: String(u._id) };
  } catch (e) {
    console.error('actorFromHeader error:', e);
  }
  next();
}

function allowRolesNoJWT(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports = { actorFromHeader, allowRolesNoJWT };
