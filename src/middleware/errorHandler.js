const ApiError = require('../utils/apiError');

/**
 * 404 Route Not Found middleware.
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized Express error-handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid value '${err.value}' for field '${err.path}'.`;
    error = new ApiError(400, message);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    for (const [field, fieldError] of Object.entries(err.errors)) {
      validationErrors[field] = fieldError.message;
    }
    const message = 'Validation failed for one or more fields.';
    error = new ApiError(400, message, validationErrors);
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue || {});
    const duplicateValues = Object.values(err.keyValue || {});
    const field = duplicateFields[0] || 'field';
    const value = duplicateValues[0] || '';
    const message = `A product with ${field} '${value}' already exists.`;
    error = new ApiError(409, message, { [field]: `${field} must be unique` });
  }

  // Handle JSON parse error (SyntaxError in body parser)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new ApiError(400, 'Invalid JSON payload received in request body.');
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.errors && Object.keys(error.errors).length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
