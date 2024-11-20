const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      error.message = 'Duplicate field value entered';
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message
      });
    }
  
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  };
  
  module.exports = errorHandler;