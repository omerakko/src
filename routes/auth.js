

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const bcrypt = require('bcrypt');
const { generateToken, verifyToken } = require('../middleware/auth');
const router = express.Router();

// In production, store this in a database
// For now, we'll use a simple in-memory admin user
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME,
  // Default password is 'admin123' - CHANGE THIS IN PRODUCTION
  passwordHash: process.env.ADMIN_PASSWORD_HASH
};

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    // Debug logs
    console.log('--- LOGIN ATTEMPT ---');
    console.log('Stored username:', ADMIN_CREDENTIALS.username);
    console.log('Stored password hash:', ADMIN_CREDENTIALS.passwordHash);
    console.log('Request body:', req.body);

    const { username, password } = req.body;

    console.log('Received username:', username);
    console.log('Received password:', password);
    console.log('Username type:', typeof username);
    console.log('Password type:', typeof password);

    // Validate input
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    // Check username
    console.log('Username comparison:', username, '===', ADMIN_CREDENTIALS.username, '?', username === ADMIN_CREDENTIALS.username);
    if (username !== ADMIN_CREDENTIALS.username) {
      console.log('Username mismatch');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Check password
    console.log('About to compare password...');
    console.log('Password to compare:', password);
    console.log('Hash to compare against:', ADMIN_CREDENTIALS.passwordHash);
    
    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);
    console.log('Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Password mismatch');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    console.log('Login successful!');

    // Generate JWT token
    const token = generateToken({
      username: username,
      role: 'admin',
      loginTime: new Date().toISOString()
    });

    res.json({
      success: true,
      token,
      user: {
        username: username,
        role: 'admin'
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during login'
    });
  }
});

/**
 * Logout endpoint (client-side token removal, but we can track server-side)
 */
router.post('/logout', verifyToken, (req, res) => {
  // In a more complex setup, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Check if user is authenticated
 */
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: {
      username: req.user.username,
      role: req.user.role
    },
    message: 'Token is valid'
  });
});

/**
 * Change password endpoint
 */
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, ADMIN_CREDENTIALS.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // In production, you'd update this in the database
    // For now, we'll just return a success message
    console.log('New password hash (save this):', newPasswordHash);

    res.json({
      success: true,
      message: 'Password changed successfully. Please update your environment variables with the new hash.',
      newPasswordHash: newPasswordHash
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while changing password'
    });
  }
});

module.exports = router;