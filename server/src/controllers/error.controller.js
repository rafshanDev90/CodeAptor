import logger from '../middlewares/logger.js';

const handleAppError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

const handlePgError = (err, res) => {
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'fail',
      message: 'Duplicate value. This record already exists.',
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'fail',
      message: 'Referenced record does not exist.',
    });
  }
  if (err.code === '22P02') {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid input format.',
    });
  }

  res.status(500).json({
    status: 'error',
    message: 'A database error occurred',
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.isOperational) {
    return handleAppError(err, res);
  }

  if (err.code && err.code.startsWith('23')) {
    return handlePgError(err, res);
  }

  logger.error('Unhandled Express error', { error: err.message, stack: err.stack });

  res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

export default globalErrorHandler;
