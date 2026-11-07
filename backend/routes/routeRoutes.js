import express from 'express';
import { getAlternativeRoutes, optimizeRoutes, getRouteHistory, saveJourney, getJourneys } from '../controllers/routeController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/alternatives', optionalAuth, getAlternativeRoutes);
router.post('/optimize', optionalAuth, optimizeRoutes);
router.get('/history', optionalAuth, getRouteHistory);
router.post('/save-journey', optionalAuth, saveJourney);
router.get('/journeys', optionalAuth, getJourneys);

export default router;
