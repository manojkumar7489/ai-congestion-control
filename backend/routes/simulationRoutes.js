import express from 'express';
import { runSimulation, getSimulationResults } from '../controllers/simulationController.js';

const router = express.Router();

router.post('/run', runSimulation);
router.get('/results', getSimulationResults);

export default router;
