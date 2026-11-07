import express from 'express';
import { getProfile, updateProfile, getSavedLocations, addSavedLocation } from '../controllers/userController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', optionalAuth, getProfile);
router.put('/profile', optionalAuth, updateProfile);
router.get('/saved-locations', optionalAuth, getSavedLocations);
router.post('/saved-locations', optionalAuth, addSavedLocation);

export default router;
