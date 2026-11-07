import { calculateRoutes } from '../services/routingService.js';
import { callAIOptimize } from '../services/aiServiceBridge.js';
import { RouteHistory, Journey } from '../models/TrafficModels.js';

// In-memory history fallback
const memoryHistory = [];
const memoryJourneys = [];

export const getAlternativeRoutes = async (req, res) => {
  try {
    const { origin, destination, vehicleType, weights } = req.body;

    if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
      return res.status(400).json({ success: false, message: 'Origin and destination with coordinates are required.' });
    }

    const rawRoutes = await calculateRoutes(
      { originLat: origin.lat, originLng: origin.lng },
      { destLat: destination.lat, destLng: destination.lng }
    );

    // Pass through AI optimization engine
    const optimizedResponse = await callAIOptimize(rawRoutes, vehicleType || 'sedan', weights);

    // Save to history log
    const historyItem = {
      id: 'rh_' + Date.now(),
      origin,
      destination,
      vehicleType: vehicleType || 'sedan',
      routes: optimizedResponse.routes,
      timestamp: new Date().toISOString()
    };
    memoryHistory.unshift(historyItem);
    if (memoryHistory.length > 20) memoryHistory.pop();

    try {
      await RouteHistory.create({
        origin: { name: origin.name, coords: [origin.lat, origin.lng] },
        destination: { name: destination.name, coords: [destination.lat, destination.lng] },
        vehicleType: vehicleType || 'sedan',
        candidateCount: optimizedResponse.routes.length,
        recommendedRoute: optimizedResponse.routes[0],
        timestamp: new Date()
      });
    } catch (e) {}

    res.json({
      success: true,
      data: {
        origin,
        destination,
        vehicle_type: optimizedResponse.vehicle_type,
        weights_used: optimizedResponse.weights_used,
        routes: optimizedResponse.routes,
        recommended_route_id: optimizedResponse.routes[0]?.id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const optimizeRoutes = async (req, res) => {
  try {
    const { routes, vehicleType, weights } = req.body;
    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ success: false, message: 'Candidate routes array is required.' });
    }

    const result = await callAIOptimize(routes, vehicleType || 'sedan', weights);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRouteHistory = async (req, res) => {
  try {
    try {
      const dbHistory = await RouteHistory.find().sort({ timestamp: -1 }).limit(10);
      if (dbHistory && dbHistory.length > 0) {
        return res.json({ success: true, history: dbHistory });
      }
    } catch (e) {}

    res.json({ success: true, history: memoryHistory.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveJourney = async (req, res) => {
  try {
    const {
      originName,
      originCoords,
      destinationName,
      destinationCoords,
      vehicleType,
      chosenRouteName,
      distanceKm,
      actualDistanceKm,
      plannedDistanceKm,
      durationMins,
      rideDurationSecs,
      fuelLiters,
      fuelSavedLiters,
      timeSavedMins,
      averageSpeedKmh,
      score,
      rideStatus
    } = req.body;

    const userId = req.user?._id || 'guest';

    const journey = {
      id: 'j_' + Date.now(),
      userId,
      originName: originName || 'Origin Point',
      originCoords: originCoords || [16.5117, 80.6186],
      destinationName: destinationName || 'Destination Point',
      destinationCoords: destinationCoords || [16.5255, 80.6720],
      vehicleType: vehicleType || 'sedan',
      chosenRouteName: chosenRouteName || 'Recommended Route',
      distanceKm: distanceKm || plannedDistanceKm || 5.0,
      plannedDistanceKm: plannedDistanceKm || distanceKm || 5.0,
      actualDistanceKm: actualDistanceKm !== undefined ? actualDistanceKm : (distanceKm || 5.0),
      durationMins: durationMins || 15.0,
      rideDurationSecs: rideDurationSecs || Math.round((durationMins || 15.0) * 60),
      fuelLiters: fuelLiters || 0.8,
      fuelSavedLiters: fuelSavedLiters || 0,
      timeSavedMins: timeSavedMins || 0,
      averageSpeedKmh: averageSpeedKmh || 30.0,
      score: score || 0.25,
      rideStatus: rideStatus || 'COMPLETED',
      completedAt: new Date().toISOString()
    };

    memoryJourneys.unshift(journey);
    if (memoryJourneys.length > 50) memoryJourneys.pop();

    try {
      await Journey.create({
        ...journey,
        completedAt: new Date()
      });
    } catch (e) {}

    res.json({ success: true, message: 'Ride completed and journey saved successfully', journey });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJourneys = async (req, res) => {
  try {
    try {
      const dbJourneys = await Journey.find().sort({ completedAt: -1 }).limit(20);
      if (dbJourneys && dbJourneys.length > 0) {
        return res.json({ success: true, journeys: dbJourneys });
      }
    } catch (e) {}

    res.json({ success: true, journeys: memoryJourneys.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
