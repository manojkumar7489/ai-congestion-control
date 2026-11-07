# SmartRoute AI - Architectural Specification & Technical Whitepaper

## 1. System Overview

SmartRoute AI is an intelligent traffic congestion prediction, multi-criteria route optimization, and coordinated traffic balancing platform created for academic Techthon competitions.

Unlike standard commercial navigation systems that greedily recommend the shortest geometric path to every individual driver (which frequently over-saturates arterials and triggers phantom traffic jams), SmartRoute AI models both individual trip costs (travel time, stop-and-go fuel penalties, idling emissions) and macroscopic road network capacity using the classic Bureau of Public Roads (BPR) link delay equations.

---

## 2. Decoupled Multi-Service Topology

```
+--------------------------------------------------------------+
|                   React Frontend (Port 5173)                 |
|  - Pure React + Plain CSS3 (No Bootstrap / Tailwind / MUI)   |
|  - Custom Web Mercator OpenStreetMap Engine (No Leaflet)     |
|  - Native SVG Charts (No Chart.js / Recharts / D3)           |
+------------------------------+-------------------------------+
                               | Native Fetch API
                               v
+--------------------------------------------------------------+
|              Node.js Express Gateway (Port 5000)             |
|  - JWT Authentication & BCrypt Password Hashing              |
|  - MongoDB Mongoose Schemas & In-Memory Fallback             |
|  - OpenStreetMap Nominatim Geocoding Throttling & Caching    |
|  - OSRM Driving Engine Integration (True Road Geometries)    |
|  - Socket.IO Real-time Traffic Event Broadcaster             |
+------------------------------+-------------------------------+
                               | REST Proxy & Protocol Adapter
                               v
+--------------------------------------------------------------+
|            Python FastAPI AI Microservice (Port 8001)        |
|  - Scikit-Learn RandomForestRegressor (15/30/45/60m Forecast)|
|  - Physics-Based Fuel & CO2 Modeling (4 Vehicle Types)       |
|  - Multi-Criteria Route Scoring & Human Explanations         |
|  - Coordinated Traffic Distribution Engine (BPR Delay Model) |
+--------------------------------------------------------------+
```

---

## 3. Strict Technological Compliance Matrix

| Subsystem | Requirement | Implementation | Justification / Validation |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js only | React 18 + Vite | Lightweight, fast HMR on port 5173 |
| **Frontend Styling** | Plain CSS3 only | `src/styles/main.css` | Zero external CSS frameworks (no Tailwind, Bootstrap, MUI) |
| **Interactive Map** | OpenStreetMap without Leaflet | `src/components/MapView.jsx` | Native Web Mercator (EPSG:3857) tile math, panning, zooming, and SVG overlays |
| **Charting Engine** | Native SVG only | `src/components/SvgCharts.jsx` | Zero Chart.js / Recharts / D3. Handcrafted SVG paths & polygons |
| **Backend API** | Node.js + Express | `backend/server.js` | REST architecture with Socket.IO support |
| **Database** | MongoDB + Mongoose | `backend/models/` | 8 Mongoose models with graceful standalone fallback |
| **AI / ML Service** | Python + FastAPI | `ai-service/app/main.py` | RandomForestRegressor trained on diurnal curves |

---

## 4. Mathematical Modeling Foundations

### A. Web Mercator Coordinate Projection (EPSG:3857)
To plot latitude/longitude points on 256x256 raster map tiles without Leaflet:
$$X = \frac{\text{lng} + 180}{360} \times 256 \times 2^Z$$
$$Y = \left(1 - \frac{\ln(\tan(\frac{\pi}{4} + \frac{\text{lat}_{\text{rad}}}{2}))}{\pi}\right) \times 128 \times 2^Z$$

### B. Bureau of Public Roads (BPR) Link Performance Function
To calculate delay escalation when traffic volume approaches or exceeds road capacity:
$$T = T_0 \times \left(1 + \alpha \left(\frac{V}{C}\right)^\beta\right)$$
where $\alpha = 0.15$, $\beta = 4.0$, $T_0$ is free-flow travel time, $V$ is assigned vehicle volume, and $C$ is practical lane capacity.

### C. Multi-Criteria Route Scoring Formulation
$$\text{Route Score} = w_{\text{time}} \cdot \hat{T} + w_{\text{fuel}} \cdot \hat{F} + w_{\text{congestion}} \cdot \hat{P}$$
where $\hat{T}$, $\hat{F}$, and $\hat{P}$ are min-max normalized factors across candidate corridors. Default calibrated weights:
$$w_{\text{time}} = 0.45, \quad w_{\text{fuel}} = 0.30, \quad w_{\text{congestion}} = 0.25$$

---

## 5. Vijayawada, Andhra Pradesh Demo Network

The application is deterministic and works completely out of the box without paid API credentials:
- **Major Intersections**: PNBS (Bus Station), Railway Station, Benz Circle (NH-16 & MG Road), Ramavarappadu Ring, Prakasam Barrage / Kanaka Durga Temple, Auto Nagar.
- **Corridors**: MG Road (Bandar Road), Eluru Road, NH-16 Express Bypass, Inner Ring Road.
- **Scenarios**: Morning Commute Peak (+35%), Heavy Monsoon Rainstorm (-25% capacity), Commercial Breakdown on Benz Circle.
