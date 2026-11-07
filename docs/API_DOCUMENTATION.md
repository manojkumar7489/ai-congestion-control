# SmartRoute AI - REST API Documentation

SmartRoute AI exposes high-performance REST APIs across two decoupled backend microservices:
1. **Node.js Gateway (Port 5000)** - Application API, Authentication, MongoDB Persistence, Geocoding, Real-time WebSockets.
2. **Python FastAPI Engine (Port 8001)** - Machine Learning inference, Multi-Criteria optimization, BPR simulation calculations.

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user profile with bcrypt password hashing.

**Request Body:**
```json
{
  "name": "Ramesh Kumar",
  "email": "user@smartroute.ai",
  "password": "SecurePassword123!",
  "preferredVehicle": "sedan"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "673f8a...",
    "name": "Ramesh Kumar",
    "email": "user@smartroute.ai",
    "role": "user",
    "preferredVehicle": "sedan",
    "routingWeights": { "time": 0.45, "fuel": 0.30, "congestion": 0.25 }
  }
}
```

### `POST /api/auth/login`
Authenticates credentials and returns a 7-day JWT token.

### `GET /api/auth/me`
*Protected (Header: `Authorization: Bearer <token>`)*
Returns active user profile.

---

## 2. Route Optimization Endpoints

### `POST /api/routes/alternatives`
Calculates candidate road corridors using OSRM, evaluates traffic delays, calculates vehicle fuel consumption, and applies the SmartRoute multi-factor scoring formula:

$$\text{Route Score} = 0.45 \times \text{Norm(Time)} + 0.30 \times \text{Norm(Fuel)} + 0.25 \times \text{Norm(Congestion)}$$

**Request Body:**
```json
{
  "origin": { "name": "PNBS", "lat": 16.5117, "lng": 80.6186 },
  "destination": { "name": "Ramavarappadu", "lat": 16.5255, "lng": 80.6720 },
  "vehicleType": "sedan",
  "weights": { "time": 0.45, "fuel": 0.30, "congestion": 0.25 }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vehicle_type": "sedan",
    "weights_used": { "time": 0.45, "fuel": 0.30, "congestion": 0.25 },
    "recommended_route_id": "osrm-route-1",
    "routes": [
      {
        "id": "osrm-route-1",
        "name": "Primary Arterial Corridor",
        "via": "via NH-16 Flyover Bypass",
        "distance_km": 7.8,
        "duration_mins": 14.2,
        "congestion_index": 0.24,
        "score": 0.18,
        "is_recommended": true,
        "fuel_liters": 0.62,
        "fuel_data": {
          "vehicle_type": "Sedan",
          "total_fuel_liters": 0.62,
          "co2_emissions_kg": 1.43,
          "is_estimate": true
        },
        "recommendation_explanation": "Recommended: This route offers the lowest travel time (14.2 mins) and bypasses heavy traffic bottlenecks, delivering the best composite SmartRoute score of 0.18.",
        "geometry": [[16.5117, 80.6186], [16.518, 80.635], ...]
      }
    ]
  }
}
```

---

## 3. Traffic Telemetry & Predictions

### `GET /api/traffic/current`
Returns current Vijayawada network health, average speed, aggregate delay, and active incidents.

### `GET /api/traffic/status`
Returns system data source mode (`LIVE DATA` vs `DEMO SIMULATION DATA`), last refresh timestamp, and 24-hour diurnal curve points.

### `GET /api/traffic/forecast`
Returns multi-horizon predictions for 15m, 30m, 45m, and 60m horizons with predicted speeds and severity classifications.

---

## 4. Coordinated Traffic Simulation

### `POST /api/simulation/run`
Simulates Mode A (Independent/Selfish) vs Mode B (Coordinated Distribution) using the Bureau of Public Roads (BPR) link delay function:

$$T(V) = T_0 \times \left(1 + 0.15 \times \left(\frac{V}{C}\right)^4\right)$$

**Request Body:**
```json
{
  "vehicleCount": 350,
  "scenario": "rush_hour"
}
```

**Response (200 OK):**
Returns comparative average travel time, total fleet delay hours, corridor load saturation percentages, and carbon savings.

---

## 5. Admin & Systems Diagnostics

### `GET /api/admin/system-status`
Comprehensive probe of Express gateway, Python AI microservice latency, MongoDB connection state, and geospatial API throttling.
