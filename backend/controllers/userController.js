import User from '../models/User.js';
import { SavedLocation } from '../models/TrafficModels.js';

// Fallback in-memory saved locations
const memoryLocations = new Map();

// Seed initial locations
memoryLocations.set('default', [
  { id: 'loc-1', label: 'Home (Labbipet)', address: 'Bandar Road, Labbipet, Vijayawada', lat: 16.5060, lng: 80.6420, icon: 'home' },
  { id: 'loc-2', label: 'Campus / Office', address: 'NH-16 Tech Hub, Benz Circle, Vijayawada', lat: 16.5015, lng: 80.6508, icon: 'work' },
  { id: 'loc-3', label: 'Transit Hub', address: 'Pandit Nehru Bus Station (PNBS), Vijayawada', lat: 16.5117, lng: 80.6186, icon: 'bus' }
]);

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || 'demo_user';
    try {
      const user = await User.findById(userId).select('-password');
      if (user) {
        return res.json({ success: true, profile: user });
      }
    } catch (e) {}

    res.json({
      success: true,
      profile: {
        id: userId,
        name: req.user?.name || 'Demo Engineer',
        email: req.user?.email || 'demo@smartroute.ai',
        role: req.user?.role || 'admin',
        preferredVehicle: req.user?.preferredVehicle || 'sedan',
        routingWeights: req.user?.routingWeights || { time: 0.45, fuel: 0.30, congestion: 0.25 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, preferredVehicle, routingWeights } = req.body;
    const userId = req.user?._id || req.user?.id;

    try {
      const user = await User.findById(userId);
      if (user) {
        if (name) user.name = name;
        if (preferredVehicle) user.preferredVehicle = preferredVehicle;
        if (routingWeights) user.routingWeights = routingWeights;
        await user.save();
        return res.json({ success: true, message: 'Profile updated successfully', profile: user });
      }
    } catch (e) {}

    // In-memory update
    if (req.user) {
      if (name) req.user.name = name;
      if (preferredVehicle) req.user.preferredVehicle = preferredVehicle;
      if (routingWeights) req.user.routingWeights = routingWeights;
    }

    res.json({
      success: true,
      message: 'Profile updated in session',
      profile: {
        id: userId,
        name: name || req.user?.name,
        preferredVehicle: preferredVehicle || req.user?.preferredVehicle,
        routingWeights: routingWeights || req.user?.routingWeights
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSavedLocations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || 'default';
    try {
      const dbLocations = await SavedLocation.find({ userId });
      if (dbLocations && dbLocations.length > 0) {
        return res.json({ success: true, locations: dbLocations });
      }
    } catch (e) {}

    const list = memoryLocations.get(userId) || memoryLocations.get('default') || [];
    res.json({ success: true, locations: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addSavedLocation = async (req, res) => {
  try {
    const { label, address, lat, lng, icon } = req.body;
    const userId = req.user?._id || req.user?.id || 'default';

    if (!label || !address || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Label, address, lat, and lng are required.' });
    }

    const newLoc = {
      id: 'loc_' + Date.now(),
      userId,
      label,
      address,
      lat,
      lng,
      icon: icon || 'pin'
    };

    try {
      const dbLoc = await SavedLocation.create(newLoc);
      return res.status(201).json({ success: true, location: dbLoc });
    } catch (e) {}

    const existing = memoryLocations.get(userId) || [...(memoryLocations.get('default') || [])];
    existing.push(newLoc);
    memoryLocations.set(userId, existing);

    res.status(201).json({ success: true, location: newLoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
