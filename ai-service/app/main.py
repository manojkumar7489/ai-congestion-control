"""
SmartRoute AI - FastAPI Microservice
Exposes Prediction, Optimization, and Simulation REST Endpoints
"""
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.prediction.traffic_model import TrafficPredictionEngine
from app.optimization.route_optimizer import RouteOptimizer, dijkstra_traffic_routing
from app.simulation.coordinated_distribution import CoordinatedTrafficSimulator

app = FastAPI(
    title="SmartRoute AI Engine",
    description="Traffic Congestion Prediction, Smart Multi-Criteria Route Optimization, and Coordinated Traffic Balancing Microservice",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
prediction_engine = TrafficPredictionEngine()
route_optimizer = RouteOptimizer()
simulation_engine = CoordinatedTrafficSimulator()

# Pydantic Request Models
class PredictRequest(BaseModel):
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    current_speed: Optional[float] = 30.0
    free_flow_speed: Optional[float] = 50.0
    weather_factor: Optional[float] = 1.0
    has_incident: Optional[bool] = False

class BatchPredictRequest(BaseModel):
    segments: List[PredictRequest]

class RouteCandidate(BaseModel):
    id: Optional[str] = None
    name: str
    distance_km: float
    duration_mins: float
    congestion_index: Optional[float] = 0.35
    geometry: Optional[List[List[float]]] = None
    steps: Optional[List[Dict[str, Any]]] = None

class OptimizeRequest(BaseModel):
    routes: List[RouteCandidate]
    vehicle_type: Optional[str] = "sedan"
    weights: Optional[Dict[str, float]] = None

class SimulationRequest(BaseModel):
    vehicle_count: Optional[int] = 300
    scenario: Optional[str] = "rush_hour"


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SmartRoute AI Service",
        "timestamp": datetime.utcnow().isoformat(),
        "model_status": {
            "trained": prediction_engine.is_trained,
            "metrics": prediction_engine.metrics
        }
    }


@app.post("/predict")
def predict_traffic(req: PredictRequest):
    """
    Predict congestion index and speeds for 15, 30, 45, and 60 minute horizons.
    """
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    day = req.day_of_week if req.day_of_week is not None else now.weekday()

    result = prediction_engine.predict_congestion(
        hour=hour,
        day_of_week=day,
        current_speed=req.current_speed or 30.0,
        free_flow_speed=req.free_flow_speed or 50.0,
        weather_factor=req.weather_factor or 1.0,
        has_incident=req.has_incident or False
    )
    return {
        "status": "success",
        "request_time": now.isoformat(),
        "prediction": result
    }


@app.get("/predict/forecast")
def get_forecast(corridor_id: Optional[str] = None, weather_factor: float = 1.0):
    """
    Returns rolling multi-horizon traffic forecasts for current hour.
    """
    now = datetime.now()
    result = prediction_engine.predict_congestion(
        hour=now.hour,
        day_of_week=now.weekday(),
        current_speed=28.0,
        free_flow_speed=50.0,
        weather_factor=weather_factor,
        has_incident=False
    )
    return {
        "status": "success",
        "forecast_hour": now.hour,
        "horizons": result["horizons"],
        "severity": result["severity"]
    }


@app.post("/predict/batch")
def batch_predict(req: BatchPredictRequest):
    """
    Batch segment congestion predictions.
    """
    now = datetime.now()
    results = []
    for item in req.segments:
        hour = item.hour if item.hour is not None else now.hour
        day = item.day_of_week if item.day_of_week is not None else now.weekday()
        res = prediction_engine.predict_congestion(
            hour=hour,
            day_of_week=day,
            current_speed=item.current_speed or 30.0,
            free_flow_speed=item.free_flow_speed or 50.0,
            weather_factor=item.weather_factor or 1.0,
            has_incident=item.has_incident or False
        )
        results.append(res)
    return {"status": "success", "count": len(results), "results": results}


@app.post("/optimize")
def optimize_route(req: OptimizeRequest):
    """
    Ranks candidate routes using composite score:
    Route Score = 0.45 * Norm(Time) + 0.30 * Norm(Fuel) + 0.25 * Norm(Congestion)
    Generates fuel metrics and transparent explanation.
    """
    if not req.routes:
        raise HTTPException(status_code=400, detail="At least one candidate route is required")

    route_dicts = [r.dict() for r in req.routes]
    ranked = route_optimizer.optimize_routes(
        routes=route_dicts,
        vehicle_type=req.vehicle_type or "sedan",
        weights=req.weights
    )
    return {
        "status": "success",
        "vehicle_type": req.vehicle_type,
        "weights_used": req.weights or {"time": 0.45, "fuel": 0.30, "congestion": 0.25},
        "routes": ranked
    }


@app.post("/simulate/coordinated")
def simulate_coordinated_traffic(req: SimulationRequest):
    """
    Simulates Mode A (Independent/Selfish) vs Mode B (Coordinated Distribution)
    with BPR link performance delay curves.
    """
    results = simulation_engine.run_simulation(
        vehicle_count=req.vehicle_count or 300,
        scenario=req.scenario or "rush_hour"
    )
    return {
        "status": "success",
        "data": results
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=False)
