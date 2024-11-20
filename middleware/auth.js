const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = await Admin.findById(decoded.id);
      next();
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};