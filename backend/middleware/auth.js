import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smartroute_super_secure_jwt_secret_techthon_2026';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Find user in DB or in mock user store
    let user = null;
    try {
      user = await User.findById(decoded.id).select('-password');
    } catch (e) {
      // DB might be offline, fallback to token payload
    }

    if (!user) {
      req.user = { _id: decoded.id, name: decoded.name || 'Demo User', email: decoded.email, role: decoded.role || 'user' };
    } else {
      req.user = user;
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      let user = null;
      try {
        user = await User.findById(decoded.id).select('-password');
      } catch (e) {}
      req.user = user || { _id: decoded.id, name: decoded.name || 'Demo User', email: decoded.email };
    } catch (e) {}
  }
  next();
};

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, name: user.name, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
