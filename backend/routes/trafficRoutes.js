import express from 'express';
import { getCurrentTraffic, getRoadSegments, getTrafficStatus, predictTraffic, getForecast } from '../controllers/trafficController.js';

const router = express.Router();

router.get('/current', getCurrentTraffic);
router.get('/segments', getRoadSegments);
router.get('/status', getTrafficStatus);
router.post('/predict', predictTraffic);
router.get('/forecast', getForecast);

export default router;
