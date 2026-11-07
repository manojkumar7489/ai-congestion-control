import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import trafficRoutes from './routes/trafficRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import geocodingRoutes from './routes/geocodingRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'SmartRoute AI Gateway',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/predictions', trafficRoutes); // Alias for predictions as per spec
app.use('/api/simulation', simulationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocoding', geocodingRoutes);

// Socket.IO real-time notification engine
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.emit('system_notification', {
    type: 'CONNECTION_READY',
    message: 'Connected to SmartRoute AI Real-Time Traffic Stream',
    interval_seconds: 30,
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Periodic simulated live update broadcaster (every 30 seconds)
setInterval(() => {
  const jitter = Math.round((Math.random() * 0.08 - 0.04) * 100) / 100;
  const simulatedUpdate = {
    type: 'TRAFFIC_REFRESH',
    timestamp: new Date().toISOString(),
    city: 'Vijayawada',
    corridor_delta: 'Benz Circle flyover flow normalized',
    jitter_delta: jitter,
    active_advisories: 2
  };
  io.emit('traffic_update', simulatedUpdate);
}, 30000);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Initialize database & start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  SmartRoute AI Backend running on port ${PORT}`);
    console.log(`  Target Frontend URL: ${FRONTEND_URL}`);
    console.log(`  AI Microservice Target: ${process.env.AI_SERVICE_URL || 'http://localhost:8001'}`);
    console.log(`====================================================`);
  });
});
