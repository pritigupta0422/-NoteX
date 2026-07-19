const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'engineering_notes_pyq_secret_2026_super_secure';
const JWT_EXPIRES_IN = '7d';

// Email regex validation
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const signup = async (req, res) => {
  try {
    const { name, email, password, branch, semester } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check duplicate
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user object
    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      branch: branch || '',
      semester: semester || '',
      role: 'user', // Default role. First user can be set to admin or modify manually
      createdAt: new Date().toISOString()
    };

    // Save to database
    await db.createUser(newUser);

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Return user details and token
    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        branch: newUser.branch,
        semester: newUser.semester,
        role: newUser.role,
        whitelist: newUser.whitelist || ''
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        semester: user.semester,
        role: user.role,
        whitelist: user.whitelist || ''
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error('Get Me Error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching profile' });
  }
};

const updateWhitelist = async (req, res) => {
  try {
    const { whitelist } = req.body;
    const success = await db.updateUserWhitelist(req.user.id, whitelist || '');
    if (success) {
      return res.status(200).json({ message: 'Whitelist updated successfully', whitelist: whitelist || '' });
    } else {
      return res.status(500).json({ message: 'Failed to update whitelist' });
    }
  } catch (error) {
    console.error('Update Whitelist Error:', error);
    return res.status(500).json({ message: 'Internal Server Error updating whitelist' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateWhitelist
};
