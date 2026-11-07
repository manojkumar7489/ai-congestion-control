"""
SmartRoute AI - Route Optimizer & Fuel Consumption Engine
Implements Multi-Criteria Route Scoring, Vehicle Fuel Modeling,
Graph Pathfinding (Dijkstra/A*), and Human-Readable Recommendation Explanations.
"""
import math
import heapq
from typing import List, Dict, Any, Optional

# Vehicle baseline fuel specifications
VEHICLE_PROFILES = {
    "motorcycle": {
        "name": "Motorcycle",
        "base_km_per_liter": 42.0,
        "idle_liters_per_hour": 0.35,
        "congestion_penalty_factor": 0.20,
        "co2_grams_per_km": 65.0
    },
    "compact": {
        "name": "Compact Car",
        "base_km_per_liter": 18.5,
        "idle_liters_per_hour": 0.70,
        "congestion_penalty_factor": 0.35,
        "co2_grams_per_km": 125.0
    },
    "sedan": {
        "name": "Sedan",
        "base_km_per_liter": 14.0,
        "idle_liters_per_hour": 0.95,
        "congestion_penalty_factor": 0.40,
        "co2_grams_per_km": 165.0
    },
    "suv": {
        "name": "SUV",
        "base_km_per_liter": 10.2,
        "idle_liters_per_hour": 1.30,
        "congestion_penalty_factor": 0.50,
        "co2_grams_per_km": 230.0
    }
}


class RouteOptimizer:
    def __init__(self, w_time: float = 0.45, w_fuel: float = 0.30, w_congestion: float = 0.25):
        self.w_time = w_time
        self.w_fuel = w_fuel
        self.w_congestion = w_congestion

    def calculate_fuel_consumption(self, distance_km: float, duration_mins: float,
                                   congestion_index: float, vehicle_type: str = "sedan") -> Dict[str, Any]:
        """
        Calculates vehicle fuel consumption incorporating distance, speed,
        stop-and-go congestion cycles, and idling delays.
        """
        profile = VEHICLE_PROFILES.get(vehicle_type.lower(), VEHICLE_PROFILES["sedan"])

        # Base fuel consumption under free-flow conditions
        base_liters = distance_km / profile["base_km_per_liter"]

        # Congestion delay excess (difference from free-flow speed assumption)
        free_flow_mins = (distance_km / 50.0) * 60.0
        delay_mins = max(0.0, duration_mins - free_flow_mins)

        # Idling fuel burned in standstill or crawling traffic
        idling_hours = (delay_mins * (0.4 + 0.6 * congestion_index)) / 60.0
        idling_fuel = idling_hours * profile["idle_liters_per_hour"]

        # Stop-and-go acceleration cycle penalty
        stop_go_factor = 1.0 + (congestion_index * profile["congestion_penalty_factor"])
        running_fuel = base_liters * stop_go_factor

        total_liters = round(running_fuel + idling_fuel, 2)
        total_co2_kg = round((distance_km * profile["co2_grams_per_km"] / 1000.0) * (total_liters / max(base_liters, 0.01)), 2)

        return {
            "vehicle_type": profile["name"],
            "total_fuel_liters": total_liters,
            "fuel_unit": "Liters",
            "base_liters": round(base_liters, 2),
            "idling_fuel_liters": round(idling_fuel, 2),
            "co2_emissions_kg": total_co2_kg,
            "is_estimate": True,
            "disclaimer": "Figures are calculated estimations based on vehicle fuel maps and road congestion factors."
        }

    def optimize_routes(self, routes: List[Dict[str, Any]], vehicle_type: str = "sedan",
                        weights: Optional[Dict[str, float]] = None) -> List[Dict[str, Any]]:
        """
        Scores and ranks candidate routes based on normalized travel time,
        fuel consumption, and congestion penalty.
        Generates comprehensive human-readable explanation for recommendations.
        """
        if not routes:
            return []

        w_time = weights.get("time", self.w_time) if weights else self.w_time
        w_fuel = weights.get("fuel", self.w_fuel) if weights else self.w_fuel
        w_cong = weights.get("congestion", self.w_congestion) if weights else self.w_congestion

        # Step 1: Compute raw metrics for each route
        evaluated = []
        for r in routes:
            dist = float(r.get("distance_km", 5.0))
            dur = float(r.get("duration_mins", 15.0))
            cong = float(r.get("congestion_index", 0.4))

            fuel_data = self.calculate_fuel_consumption(dist, dur, cong, vehicle_type)

            evaluated.append({
                **r,
                "distance_km": dist,
                "duration_mins": dur,
                "congestion_index": cong,
                "fuel_data": fuel_data,
                "fuel_liters": fuel_data["total_fuel_liters"]
            })

        # Step 2: Normalize metrics across candidates (min-max normalization)
        times = [x["duration_mins"] for x in evaluated]
        fuels = [x["fuel_liters"] for x in evaluated]
        congs = [x["congestion_index"] for x in evaluated]

        min_time, max_time = min(times), max(times)
        min_fuel, max_fuel = min(fuels), max(fuels)
        min_cong, max_cong = min(congs), max(congs)

        def norm(val, v_min, v_max):
            if v_max <= v_min:
                return 0.5
            return (val - v_min) / (v_max - v_min)

        for item in evaluated:
            n_time = norm(item["duration_mins"], min_time, max_time)
            n_fuel = norm(item["fuel_liters"], min_fuel, max_fuel)
            n_cong = norm(item["congestion_index"], min_cong, max_cong)

            # Combined multi-criteria score (lower is better)
            score = (w_time * n_time) + (w_fuel * n_fuel) + (w_cong * n_cong)
            item["score"] = round(score, 3)
            item["norm_factors"] = {
                "norm_time": round(n_time, 2),
                "norm_fuel": round(n_fuel, 2),
                "norm_congestion": round(n_cong, 2)
            }

        # Step 3: Sort by score ascending (lowest score is best)
        ranked = sorted(evaluated, key=lambda x: x["score"])

        # Step 4: Tag best route and generate human explanations
        best_route = ranked[0]
        shortest_dist_route = min(ranked, key=lambda x: x["distance_km"])
        fastest_time_route = min(ranked, key=lambda x: x["duration_mins"])

        for idx, item in enumerate(ranked):
            item["rank"] = idx + 1
            item["is_recommended"] = (idx == 0)

            # Generate insightful explanation
            explanations = []
            if idx == 0:
                reasons = []
                if item == fastest_time_route:
                    reasons.append(f"offers the lowest travel time ({item['duration_mins']} mins)")
                if item["congestion_index"] < 0.40:
                    reasons.append(f"bypasses heavy traffic bottlenecks ({int(item['congestion_index']*100)}% congestion)")
                if item["fuel_liters"] <= min_fuel:
                    reasons.append(f"minimizes fuel consumption ({item['fuel_liters']} L)")
                if not reasons:
                    reasons.append("optimal trade-off between fuel efficiency and traffic delay")

                explanation = f"Recommended: This route {' and '.join(reasons)}, delivering the best composite SmartRoute score of {item['score']}."
                if item["distance_km"] > shortest_dist_route["distance_km"]:
                    diff_km = round(item["distance_km"] - shortest_dist_route["distance_km"], 1)
                    time_saved = round(shortest_dist_route["duration_mins"] - item["duration_mins"], 1)
                    if time_saved > 0:
                        explanation += f" Although it is {diff_km} km longer than the shortest path, it saves {time_saved} mins of stop-and-go congestion."
            else:
                diff_score = round(item["score"] - best_route["score"], 2)
                if item["congestion_index"] > best_route["congestion_index"]:
                    explanation = f"Alternative #{idx + 1}: Experiences higher congestion ({int(item['congestion_index']*100)}%) along core intersections (+{diff_score} score penalty)."
                elif item["duration_mins"] > best_route["duration_mins"]:
                    time_diff = round(item["duration_mins"] - best_route["duration_mins"], 1)
                    explanation = f"Alternative #{idx + 1}: Takes {time_diff} minutes longer due to slower corridor flow."
                else:
                    fuel_diff = round(item["fuel_liters"] - best_route["fuel_liters"], 2)
                    explanation = f"Alternative #{idx + 1}: Uses {fuel_diff} L more fuel due to frequent stop-and-go cycles."

            item["recommendation_explanation"] = explanation

        return ranked


# Dijkstra pathfinder for graph-based routing fallback
def dijkstra_traffic_routing(graph: Dict[str, List[Dict[str, Any]]], start_node: str,
                             target_node: str) -> Optional[Dict[str, Any]]:
    """
    Finds lowest-cost path over a road network graph where edge costs are
    adjusted by congestion delays: Cost = Travel Time + alpha * Congestion Penalty.
    """
    queue = [(0.0, start_node, [])]
    visited = set()

    while queue:
        cost, current, path = heapq.heappop(queue)
        if current in visited:
            continue
        visited.add(current)
        path = path + [current]

        if current == target_node:
            return {"cost": cost, "path": path}

        for edge in graph.get(current, []):
            nxt = edge["to"]
            if nxt not in visited:
                edge_len = edge.get("length_km", 1.0)
                speed = max(10.0, edge.get("current_speed", 30.0))
                time_mins = (edge_len / speed) * 60.0
                cong = edge.get("congestion_index", 0.3)
                edge_cost = time_mins * (1.0 + 0.5 * cong)
                heapq.heappush(queue, (cost + edge_cost, nxt, path))

    return None
