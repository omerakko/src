require('dotenv').config();
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'No token provided' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Token is not valid or has expired'
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify if user is admin (you can extend this for role-based access)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Admin privileges required' 
    });
  }
  next();
};

module.exports = {
  verifyToken,
  generateToken,
  requireAdmin,
  JWT_SECRET
};