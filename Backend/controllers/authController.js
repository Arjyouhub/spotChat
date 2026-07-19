const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spotchat_super_secret_jwt_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        message: 'MongoDB is not connected. Please start your local MongoDB service or update MONGO_URI in Backend/.env',
      });
    }

    const { name, email, password, avatar, status, username } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const cleanUsername = (username || email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    const usernameExists = await User.findOne({ username: cleanUsername });
    const finalUsername = usernameExists
      ? `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}`
      : cleanUsername;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      username: finalUsername,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      status: status || 'Hey there! I am using spotChat',
      isOnline: true,
      lastSeen: new Date(),
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        message: 'MongoDB is not connected. Please start your local MongoDB service or update MONGO_URI in Backend/.env',
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanInput = email.toLowerCase().trim();
    const cleanUsername = cleanInput.replace('@', '');

    // Allow logging in with either email or @username
    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanUsername }],
    }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.username && req.body.username !== user.username) {
        const cleanUname = req.body.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const exists = await User.findOne({ username: cleanUname, _id: { $ne: user._id } });
        if (exists) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        user.username = cleanUname;
      }

      user.name = req.body.name || user.name;
      user.status = req.body.status !== undefined ? req.body.status : user.status;
      user.avatar = req.body.avatar || user.avatar;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
        isOnline: updatedUser.isOnline,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, authUser, getMe, updateProfile };
