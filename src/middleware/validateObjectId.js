const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');

/**
 * Middleware to validate MongoDB ObjectId in route parameters.
 * @param {string} paramName - Name of the route parameter (defaults to 'id')
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError(400, `Invalid product ID format: '${id}'. Must be a 24-character hexadecimal string.`));
    }
    next();
  };
};

module.exports = validateObjectId;
