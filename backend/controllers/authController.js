import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

// In-memory demo user registry for standalone execution
const demoUsers = new Map();

// Seed initial demo user
const seedDemoUser = async () => {
  const hash = await bcrypt.hash('Techthon2026!', 10);
  demoUsers.set('demo@smartroute.ai', {
    _id: '507f1f77bcf86cd799439011',
    name: 'Techthon Judge / Demo User',
    email: 'demo@smartroute.ai',
    password: hash,
    role: 'admin',
    preferredVehicle: 'sedan',
    routingWeights: { time: 0.45, fuel: 0.30, congestion: 0.25 },
    createdAt: new Date().toISOString()
  });
};
seedDemoUser();

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, preferredVehicle } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Try MongoDB first
    try {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists with this email.' });
      }
      const user = await User.create({
        name,
        email: cleanEmail,
        password,
        preferredVehicle: preferredVehicle || 'sedan'
      });
      return res.status(201).json({
        success: true,
        token: generateToken(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferredVehicle: user.preferredVehicle,
          routingWeights: user.routingWeights
        }
      });
    } catch (dbErr) {
      // MongoDB offline fallback
      if (demoUsers.has(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'User already exists with this email.' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const id = 'user_' + Date.now();
      const newUser = {
        _id: id,
        id,
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: 'user',
        preferredVehicle: preferredVehicle || 'sedan',
        routingWeights: { time: 0.45, fuel: 0.30, congestion: 0.25 },
        createdAt: new Date().toISOString()
      };
      demoUsers.set(cleanEmail, newUser);

      return res.status(201).json({
        success: true,
        token: generateToken(newUser),
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          preferredVehicle: newUser.preferredVehicle,
          routingWeights: newUser.routingWeights
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Try MongoDB
    try {
      const user = await User.findOne({ email: cleanEmail });
      if (user && (await user.matchPassword(password))) {
        return res.json({
          success: true,
          token: generateToken(user),
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            preferredVehicle: user.preferredVehicle,
            routingWeights: user.routingWeights
          }
        });
      }
    } catch (dbErr) {}

    // 2. Demo User Fallback
    if (demoUsers.has(cleanEmail)) {
      const u = demoUsers.get(cleanEmail);
      const matches = await bcrypt.compare(password, u.password);
      if (matches) {
        return res.json({
          success: true,
          token: generateToken(u),
          user: {
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            preferredVehicle: u.preferredVehicle,
            routingWeights: u.routingWeights
          }
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'user',
        preferredVehicle: req.user.preferredVehicle || 'sedan',
        routingWeights: req.user.routingWeights || { time: 0.45, fuel: 0.30, congestion: 0.25 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
