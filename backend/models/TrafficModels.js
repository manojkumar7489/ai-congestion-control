import mongoose from 'mongoose';

// Road Segment
const RoadSegmentSchema = new mongoose.Schema({
  segmentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  corridor: { type: String, required: true },
  fromNode: String,
  toNode: String,
  lengthKm: Number,
  speedLimit: Number,
  capacityVph: Number,
  coordinates: [[Number]] // [[lat, lng], ...]
}, { timestamps: true });

// Traffic Observation
const TrafficObservationSchema = new mongoose.Schema({
  segmentId: { type: String, required: true, index: true },
  corridor: String,
  currentSpeed: Number,
  freeFlowSpeed: Number,
  congestionIndex: Number,
  delaySeconds: Number,
  isLive: { type: Boolean, default: false },
  observedAt: { type: Date, default: Date.now },
  weatherCondition: String
}, { timestamps: true });

// Traffic Prediction
const TrafficPredictionSchema = new mongoose.Schema({
  segmentId: { type: String, required: true, index: true },
  horizonMins: { type: Number, required: true },
  predictedCongestion: Number,
  predictedSpeed: Number,
  severity: String,
  modelName: { type: String, default: 'RandomForestRegressor' },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Journey / Travel Log & Ride History
const JourneySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originName: String,
  originCoords: [Number],
  destinationName: String,
  destinationCoords: [Number],
  vehicleType: { type: String, default: 'sedan' },
  chosenRouteName: String,
  distanceKm: Number, // Planned distance
  actualDistanceKm: Number, // Live tracked distance
  plannedDistanceKm: Number,
  durationMins: Number,
  rideDurationSecs: Number,
  fuelLiters: Number,
  fuelSavedLiters: { type: Number, default: 0 },
  timeSavedMins: { type: Number, default: 0 },
  averageSpeedKmh: Number,
  co2Kg: Number,
  score: Number,
  rideStatus: { type: String, default: 'COMPLETED' },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Route Search History
const RouteHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  origin: { name: String, coords: [Number] },
  destination: { name: String, coords: [Number] },
  vehicleType: String,
  candidateCount: Number,
  recommendedRoute: Object,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Simulation Result Log
const SimulationResultSchema = new mongoose.Schema({
  vehicleCount: Number,
  scenario: String,
  modeA: Object,
  modeB: Object,
  impact: Object,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Saved Location
const SavedLocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, required: true }, // e.g. "Home", "Work", "College"
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  icon: { type: String, default: 'pin' }
}, { timestamps: true });

export const RoadSegment = mongoose.models.RoadSegment || mongoose.model('RoadSegment', RoadSegmentSchema);
export const TrafficObservation = mongoose.models.TrafficObservation || mongoose.model('TrafficObservation', TrafficObservationSchema);
export const TrafficPrediction = mongoose.models.TrafficPrediction || mongoose.model('TrafficPrediction', TrafficPredictionSchema);
export const Journey = mongoose.models.Journey || mongoose.model('Journey', JourneySchema);
export const RouteHistory = mongoose.models.RouteHistory || mongoose.model('RouteHistory', RouteHistorySchema);
export const SimulationResult = mongoose.models.SimulationResult || mongoose.model('SimulationResult', SimulationResultSchema);
export const SavedLocation = mongoose.models.SavedLocation || mongoose.model('SavedLocation', SavedLocationSchema);
