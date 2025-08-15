// TEMP STUB: replace with real JWT later
exports.protect = (req, res, next) => {
  // pretend a lab admin is logged in
  req.user = { _id: 'dev-labadmin', role: 'LabAdmin' };
  next();
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};
