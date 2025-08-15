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
