import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callAIPrediction } from '../services/aiServiceBridge.js';
import { getTomTomTrafficFlow, getTomTomIncidents } from '../services/tomtomTrafficService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load demo dataset
let demoData = {
  city: "Urban Network",
  road_segments: [],
  incidents: [],
  weather_scenarios: {},
  historical_hourly_pattern: []
};

try {
  const filePath = path.resolve(__dirname, '../../data/demo/vijayawada_traffic.json');
  if (fs.existsSync(filePath)) {
    demoData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
} catch (e) {
  console.warn('[TrafficController] Could not read demo dataset:', e.message);
}

export const getCurrentTraffic = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 16.5062;
    const lng = parseFloat(req.query.lng) || 80.6480;

    let liveFlow = null;
    let liveIncidents = [];

    if (process.env.TRAFFIC_API_KEY) {
      try {
        liveFlow = await getTomTomTrafficFlow(lat, lng);
        liveIncidents = await getTomTomIncidents(lat - 0.08, lng - 0.08, lat + 0.08, lng + 0.08);
      } catch (e) {}
    }

    const isLive = Boolean(liveFlow || (liveIncidents && liveIncidents.length > 0));
    const mode = isLive ? "LIVE DATA (TomTom Traffic API)" : "DEMO SIMULATION DATA";

    const segments = demoData.road_segments || [];
    const avgCongestion = liveFlow ? liveFlow.congestionIndex : (segments.length > 0
      ? Math.round((segments.reduce((acc, s) => acc + (s.congestion_index || 0.4), 0) / segments.length) * 100) / 100
      : 0.48);

    const avgSpeed = liveFlow ? liveFlow.currentSpeedKmh : (segments.length > 0
      ? Math.round(segments.reduce((acc, s) => acc + (s.current_speed || 30), 0) / segments.length)
      : 28);

    const totalDelaySecs = liveFlow
      ? Math.max(0, liveFlow.currentTravelTimeSecs - liveFlow.freeFlowTravelTimeSecs)
      : segments.reduce((acc, s) => acc + (s.delay_seconds || 0), 0);

    const combinedIncidents = liveIncidents.length > 0 ? liveIncidents : (demoData.incidents || []);

    res.json({
      success: true,
      data_mode: mode,
      is_live: isLive,
      timestamp: new Date().toISOString(),
      city: req.query.city || (isLive ? "Local Area Network" : "Vijayawada"),
      overview: {
        average_congestion_index: avgCongestion,
        average_speed_kmh: avgSpeed,
        total_active_delay_mins: Math.round(totalDelaySecs / 60),
        active_incidents_count: combinedIncidents.length,
        road_network_health: avgCongestion < 0.35 ? "OPTIMAL" : (avgCongestion < 0.65 ? "MODERATELY_CONGESTED" : "HEAVY_CONGESTION"),
        freshness: isLive ? "Live TomTom Satellite & Sensor Telemetry" : "Refreshed just now (30s cycle)"
      },
      segments: segments.slice(0, 8),
      incidents: combinedIncidents
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoadSegments = async (req, res) => {
  try {
    res.json({
      success: true,
      count: (demoData.road_segments || []).length,
      segments: demoData.road_segments || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrafficStatus = async (req, res) => {
  try {
    const isLive = Boolean(process.env.TRAFFIC_API_KEY);
    res.json({
      success: true,
      mode: isLive ? "LIVE DATA" : "DEMO SIMULATION DATA",
      data_source: isLive ? "TomTom / HERE Traffic API" : "Vijayawada Deterministic Techthon Baseline Network",
      last_updated: new Date().toISOString(),
      active_corridors: (demoData.road_segments || []).length,
      active_incidents: (demoData.incidents || []).length,
      historical_hourly_pattern: demoData.historical_hourly_pattern || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const predictTraffic = async (req, res) => {
  try {
    const { hour, dayOfWeek, currentSpeed, freeFlowSpeed, weatherFactor, hasIncident } = req.body;
    const predictionResult = await callAIPrediction({
      hour,
      day_of_week: dayOfWeek,
      current_speed: currentSpeed,
      free_flow_speed: freeFlowSpeed,
      weather_factor: weatherFactor,
      has_incident: hasIncident
    });
    res.json({ success: true, data: predictionResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getForecast = async (req, res) => {
  try {
    const currentHour = new Date().getHours();
    const predictionResult = await callAIPrediction({
      hour: currentHour,
      day_of_week: new Date().getDay(),
      current_speed: 28.0,
      free_flow_speed: 50.0
    });
    res.json({
      success: true,
      current_hour: currentHour,
      forecast: predictionResult.prediction?.horizons || {},
      model_metadata: predictionResult.prediction?.model_metadata || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
