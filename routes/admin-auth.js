const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Simple credential check (you can enhance this with database lookup)
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign({ username, isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    
    // Store in session
    req.session.isAdmin = true;
    req.session.token = token;
    req.session.username = username;
    
    console.log('Admin login successful:', username);
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: { username, isAdmin: true }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Auth status check
router.get('/status', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ 
      authenticated: true,
      user: { username: req.session.username, isAdmin: true }
    });
  }
  res.json({ authenticated: false });
});

module.exports = router;