const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

function buildProfileResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    preferences: user.preferences,
    accessibility: user.accessibility,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      token,
      user: buildProfileResponse(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    return res.json({
      token,
      user: buildProfileResponse(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(buildProfileResponse(user));
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, email, preferences, accessibility } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (preferences !== undefined) updates.preferences = preferences;
    if (accessibility !== undefined) updates.accessibility = accessibility;

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(buildProfileResponse(updatedUser));
  } catch (error) {
    return next(error);
  }
}

const Memory = require('../models/Memory');
const Interaction = require('../models/Interaction');
const Task = require('../models/Task');

async function deleteProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Promise.all([
      Memory.deleteMany({ userId }),
      Interaction.deleteMany({ userId }),
      Task.deleteMany({ userId }),
    ]);

    return res.json({ message: 'Account and related data deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deleteProfile,
};

