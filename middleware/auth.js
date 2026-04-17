const jwt = require('jsonwebtoken');

// Read once at module load. If it's missing, fail loudly at startup so the
// problem surfaces immediately rather than returning 403s at runtime.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Verifies the Bearer token from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    // Distinguish between expired and malformed tokens so clients can react
    // correctly (expired → prompt re-login, malformed → treat as attack).
    return res.status(403).json({ error: 'Token is invalid or expired' });
  }
};

/**
 * Must run after verifyToken. Rejects non-admin users with 403.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

/**
 * Creates a signed JWT with the given payload.
 * Default expiry is 24 h — long enough to stay logged in for a work session
 * without requiring a persistent token store.
 */
const generateToken = (payload, expiresIn = '24h') =>
  jwt.sign(payload, JWT_SECRET, { expiresIn });

module.exports = { verifyToken, requireAdmin, generateToken };
