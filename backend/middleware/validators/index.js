// backend/middleware/validators/index.js
const { validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation error',
    errors: errors.array().map(e => ({
      field: e.path,
      msg: e.msg,
    })),
  });
};
