const { validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: result.array() });
  }
  next();
};
