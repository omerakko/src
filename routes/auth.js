const express  = require('express');
const bcrypt   = require('bcrypt');
const { generateToken, verifyToken } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');

const router = express.Router();

// Credentials are read from environment variables, not hardcoded.
// The password is stored as a bcrypt hash so the plaintext never lives in
// config. To generate a new hash: node generate-hash.js
const ADMIN = {
  username:     process.env.ADMIN_USERNAME,
  passwordHash: process.env.ADMIN_PASSWORD_HASH
};

if (!ADMIN.username || !ADMIN.passwordHash) {
  console.warn('[auth] ADMIN_USERNAME or ADMIN_PASSWORD_HASH is not set');
}

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Check username first, then password. Both checks use the same generic
  // error message so attackers can't enumerate valid usernames.
  const usernameMatch = username === ADMIN.username;
  const passwordMatch = usernameMatch && await bcrypt.compare(password, ADMIN.passwordHash);

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken({ username, role: 'admin' });
  res.json({ token, user: { username, role: 'admin' } });
}));

// POST /api/auth/logout  — JWT is stateless, so logout is client-side.
// This endpoint exists so the Angular interceptor can call it without errors.
router.post('/logout', verifyToken, (_req, res) => {
  res.json({ success: true });
});

// GET /api/auth/verify
router.get('/verify', verifyToken, (req, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

// POST /api/auth/change-password
// Note: this updates the in-memory ADMIN object for the current process only.
// A proper solution would persist the new hash to the database or .env file.
// For a single-admin setup this is acceptable — the operator updates .env manually.
router.post('/change-password', verifyToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const valid = await bcrypt.compare(currentPassword, ADMIN.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  // Update in-memory (survives until next restart). Operator must also update
  // ADMIN_PASSWORD_HASH in .env for the change to persist across restarts.
  ADMIN.passwordHash = newHash;

  res.json({
    success: true,
    message: 'Password changed. Update ADMIN_PASSWORD_HASH in your .env file to persist this change.',
    newHash
  });
}));

module.exports = router;
