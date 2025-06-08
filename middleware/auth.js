const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const requireAuth = (req, res, next) => {
  // Check session first
  if (req.session && req.session.isAdmin) {
    return next();
  }
  
  // Check JWT token
  const token = req.headers.authorization?.split(' ')[1] || req.session.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.isAdmin) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { requireAuth };