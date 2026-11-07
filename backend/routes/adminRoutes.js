import express from 'express';
import { getSystemStatus } from '../controllers/adminController.js';

const router = express.Router();

router.get('/system-status', getSystemStatus);

export default router;
