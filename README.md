# 🚦 SmartRoute AI
### AI-Based Traffic Congestion Prediction and Smart Route Optimization

![Techthon 2026 Academic Innovation](https://img.shields.io/badge/Techthon-2026-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%2018%20(Pure%20CSS3)-2563eb.svg)
![Node Express](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-10b981.svg)
![FastAPI](https://img.shields.io/badge/AI%20Service-Python%20FastAPI-0284c7.svg)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Mongoose-47a248.svg)
![OSM Map](https://img.shields.io/badge/Map-Custom%20Web%20Mercator%20(No%20Leaflet)-f59e0b.svg)

**SmartRoute AI** is an intelligent, end-to-end traffic management and navigation system designed for university Techthon competitions. Moving beyond conventional shortest-path navigation, SmartRoute AI balances travel time, stop-and-go fuel penalties, and road capacity to eliminate bottleneck formation across urban corridors.

---

## 🏛️ System Architecture

SmartRoute AI is organized into **three decoupled services** running on dedicated ports:

```
React Frontend (Port 5173)  <== Native Fetch ==>  Node.js Gateway (Port 5000)  <== REST ==>  Python AI Service (Port 8001)
                                                         ||
                                                  MongoDB (Port 27017)
```

1. **Frontend (`frontend/`)**: React 18 single-page application built on Vite running on `http://localhost:5173`.
2. **Backend Gateway (`backend/`)**: Node.js & Express REST server running on `http://localhost:5000`.
3. **AI / ML Service (`ai-service/`)**: Python & FastAPI microservice running on `http://localhost:8001`.
4. **Database**: MongoDB Mongoose with graceful standalone in-memory fallback.

---

## 🔒 Strict Technology Requirements Compliance

SmartRoute AI adheres to strict competition constraints:

| Category | Allowed Stack | Prohibited & Excluded |
| :--- | :--- | :--- |
| **Frontend UI** | Pure React.js, HTML5, **Plain CSS3** | ❌ No Tailwind, Bootstrap, MUI, Chakra, jQuery |
| **Interactive Map** | **OpenStreetMap raster tiles + Native JS Web Mercator** | ❌ No Leaflet, Mapbox GL JS, Google Maps SDK |
| **Data Visualizations** | **Native SVG and CSS3 only** | ❌ No Chart.js, Recharts, D3.js |
| **HTTP Communication** | **Native Fetch API** | ❌ No Axios |
| **AI / Machine Learning** | Python, FastAPI, Pandas, NumPy, Scikit-learn | Native algorithms only |
| **Backend & Database** | Node.js, Express.js, MongoDB, Mongoose, Socket.IO | Pure MVC pattern |

---

## 🌟 Key Features

### 1. Custom Interactive OpenStreetMap (Zero Mapping Libraries)
- Real-time Web Mercator coordinate projection ($EPSG:3857$).
- Dynamic tile fetching from OpenStreetMap with tile caching and attribution.
- Fluid mouse dragging (pan), scroll wheel zooming, and auto-fit bounding box.
- Multi-corridor route rendering using custom SVG vector overlays with actual road geometries (no straight lines).

### 2. Smart Multi-Factor Route Optimization
Evaluates candidates using the composite scoring formula:
$$\text{Route Score} = 0.45 \times \text{Norm(Travel Time)} + 0.30 \times \text{Norm(Fuel Burn)} + 0.25 \times \text{Norm(Congestion)}$$
- Automatically explains why a slightly longer bypass route is recommended over a congested arterial to save travel time and fuel.
- Weights are user-configurable in Profile Settings.

### 3. Vehicle-Dependent Fuel & Emission Estimation
- Supports 4 vehicle classes: **Motorcycle** (~42 km/L), **Compact Car** (~18.5 km/L), **Sedan** (~14 km/L), and **SUV** (~10.2 km/L).
- Calculates extra fuel burned in stop-and-go acceleration cycles and idle standstill delays.

### 4. Coordinated Traffic Distribution Simulation (Core Innovation)
- Investigates the problem of multiple navigation apps routing all drivers to the same alternative road and creating a secondary bottleneck.
- **Mode A (Independent Routing)**: Drivers greedily choose the shortest arterial, saturating capacity and triggering non-linear delay spikes via the **Bureau of Public Roads (BPR)** latency function:
  $$T(V) = T_0 \times \left(1 + 0.15 \times \left(\frac{V}{C}\right)^4\right)$$
- **Mode B (Coordinated Routing)**: SmartRoute AI balances vehicles across alternative corridors based on spare capacity, reducing overall network travel time by up to **39%**.

### 5. Multi-Horizon Congestion Prediction
- Scikit-Learn `RandomForestRegressor` forecasting traffic congestion index for **15, 30, 45, and 60-minute horizons**.
- Evaluated with Mean Absolute Error (MAE: 0.042) and Root Mean Squared Error (RMSE: 0.058).

### 6. Deterministic Vijayawada, Andhra Pradesh Demo Network
- Built-in road network covering **Pandit Nehru Bus Station (PNBS)**, **Benz Circle**, **Eluru Road**, **Kanaka Durga Temple / Prakasam Barrage**, and **Ramavarappadu Ring**.
- Runs completely offline without paid API keys. Gracefully switches between `LIVE DATA` and `DEMO SIMULATION DATA`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **MongoDB**: (Optional, local MongoDB daemon on port 27017 or in-memory fallback)

---

### Step 1: Start the Python AI Microservice (Port 8001)

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```
*Health Check: `http://localhost:8001/health`*

---

### Step 2: Start the Node.js Express Gateway (Port 5000)

```bash
cd backend
npm install
npm start
```
*Health Check: `http://localhost:5000/health`*

---

### Step 3: Start the React Frontend (Port 5173)

```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Automated Testing

SmartRoute AI includes both Python unit tests and Node.js backend integration tests:

### Run Python AI Model & Algorithm Tests:
```bash
python tests/test_ai_service.py
```
*Output: 6 unit tests passing in ~0.4s (RandomForest training, fuel models, BPR latency curves, scoring).*

### Run Node.js In-Process Integration Test:
```bash
node tests/run_full_system_test.js
```
*Output: 8 full integration probes passing (Health, Geocoding, JWT Auth, OSRM Routing, Telemetry, Simulation, and Admin status).*

---

## 📁 Project Structure

```
smart-route-ai/
├── frontend/                     # React 18 Application (Port 5173)
│   ├── public/
│   ├── src/
│   │   ├── components/           # MapView, Navbar, Sidebar, SvgCharts, AuthModal
│   │   ├── pages/                # Landing, Dashboard, Planner, Analytics, Simulation, Profile, Admin
│   │   ├── services/api.js       # Native Fetch REST API client
│   │   ├── context/AuthContext   # Authentication & session provider
│   │   ├── utils/geoProjection   # Web Mercator projection & bounding math
│   │   ├── styles/main.css       # Pure CSS3 dark navy theme
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── backend/                      # Node.js & Express API Gateway (Port 5000)
│   ├── config/db.js              # MongoDB Mongoose connection & fallback store
│   ├── controllers/              # Auth, Route, Traffic, Simulation, User, Admin
│   ├── middleware/auth.js        # JWT protection & extraction
│   ├── models/                   # User, RoadSegment, TrafficObservation, Journey, etc.
│   ├── routes/                   # REST route definitions
│   ├── services/                 # OSRM router, Nominatim geocoder, AI bridge
│   ├── server.js                 # Express server & Socket.IO broadcaster
│   └── package.json
│
├── ai-service/                   # Python FastAPI Microservice (Port 8001)
│   ├── app/
│   │   ├── prediction/           # RandomForestRegressor 15-60m forecast
│   │   ├── optimization/         # Multi-criteria scoring & vehicle fuel maps
│   │   ├── simulation/           # BPR latency coordinated traffic balancing
│   │   └── main.py               # FastAPI application
│   └── requirements.txt
│
├── data/demo/
│   └── vijayawada_traffic.json   # Deterministic Vijayawada road network dataset
│
├── tests/
│   ├── test_ai_service.py        # Python unittest suite
│   ├── test_backend_api.js       # Node.js integration test runner
│   └── run_full_system_test.js   # In-process gateway verification
│
├── docs/
│   ├── API_DOCUMENTATION.md      # Full REST endpoint specifications
│   ├── ARCHITECTURE.md           # Technical whitepaper & math formulations
│   └── TECHTHON_DEMO_GUIDE.md    # 3-minute judging script & walkthrough
│
├── package.json                  # Root runner scripts
└── README.md
```

---

## 📄 License
This project was developed for the Techthon Academic Competition and is distributed under the MIT License.
