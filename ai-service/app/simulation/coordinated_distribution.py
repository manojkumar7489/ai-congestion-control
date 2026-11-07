"""
SmartRoute AI - Coordinated Traffic Distribution Engine
Simulates Independent (Selfish User-Equilibrium) vs Coordinated (System-Optimal) Routing
Using the Bureau of Public Roads (BPR) Traffic Delay Latency Formulation.
"""
import random
import math
from typing import Dict, Any, List

# BPR Congestion Function Constants
BPR_ALPHA = 0.15
BPR_BETA = 4.0


def bpr_travel_time(t_free_flow: float, volume: float, capacity: float) -> float:
    """
    Standard Bureau of Public Roads (BPR) link performance function:
    T = T_0 * (1 + alpha * (V / C)^beta)
    """
    if capacity <= 0:
        return t_free_flow * 3.0
    vc_ratio = volume / capacity
    return t_free_flow * (1.0 + BPR_ALPHA * math.pow(vc_ratio, BPR_BETA))


class CoordinatedTrafficSimulator:
    def __init__(self):
        # Default corridor definitions (modeled after Vijayawada primary east-west corridors)
        self.default_corridors = [
            {
                "id": "COR-01",
                "name": "Bandar Road (MG Road)",
                "type": "Primary Arterial",
                "length_km": 6.8,
                "free_flow_speed_kmh": 45.0,
                "capacity_vph": 450,
                "base_traffic_vph": 280,
                "lanes": 4,
                "color": "#ef4444"
            },
            {
                "id": "COR-02",
                "name": "Eluru Road Corridor",
                "type": "Secondary Arterial",
                "length_km": 7.4,
                "free_flow_speed_kmh": 40.0,
                "capacity_vph": 400,
                "base_traffic_vph": 190,
                "lanes": 4,
                "color": "#3b82f6"
            },
            {
                "id": "COR-03",
                "name": "NH-16 Bypass Flyover",
                "type": "Express Bypass",
                "length_km": 9.2,
                "free_flow_speed_kmh": 65.0,
                "capacity_vph": 650,
                "base_traffic_vph": 250,
                "lanes": 6,
                "color": "#10b981"
            },
            {
                "id": "COR-04",
                "name": "Inner Ring Road Route",
                "type": "Outer Connector",
                "length_km": 10.5,
                "free_flow_speed_kmh": 55.0,
                "capacity_vph": 500,
                "base_traffic_vph": 140,
                "lanes": 4,
                "color": "#8b5cf6"
            }
        ]

    def run_simulation(self, vehicle_count: int = 300, scenario: str = "rush_hour") -> Dict[str, Any]:
        """
        Executes traffic distribution comparison between:
        - Mode A: Independent Routing (Every vehicle greedily takes the shortest/apparently fastest route)
        - Mode B: Coordinated Routing (SmartRoute AI balances vehicle assignments across corridors based on real-time BPR capacity)
        """
        random.seed(42)  # Deterministic repeatability for Techthon judging

        # Scenario modifiers
        scenario_multiplier = 1.0
        weather_desc = "Standard clear weather"
        if scenario == "rush_hour":
            scenario_multiplier = 1.35
            weather_desc = "Peak morning commute rush hour (high background baseline)"
        elif scenario == "rainstorm":
            scenario_multiplier = 1.50
            weather_desc = "Monsoon downpour: road capacity reduced by 25%"
        elif scenario == "incident":
            scenario_multiplier = 1.20
            weather_desc = "Corridor 1 lane constriction due to disabled heavy carrier"

        corridors = []
        for c in self.default_corridors:
            cap = c["capacity_vph"]
            base = c["base_traffic_vph"] * scenario_multiplier
            if scenario == "rainstorm":
                cap *= 0.75
            if scenario == "incident" and c["id"] == "COR-01":
                cap *= 0.60  # severe lane blockage

            t_free = (c["length_km"] / c["free_flow_speed_kmh"]) * 60.0  # in minutes
            corridors.append({
                **c,
                "effective_capacity": round(cap),
                "base_traffic": round(base),
                "t_free_flow_mins": round(t_free, 2)
            })

        # ==========================================
        # MODE A: INDEPENDENT ROUTING (Selfish Choice)
        # ==========================================
        # Drivers typically pick the arterial with highest perceived free-flow speed or shortest nominal distance
        # ~70% pick Bandar Road or NH-16 without knowing everyone else is also choosing it
        independent_distribution = [0.65, 0.20, 0.10, 0.05]
        assigned_vehicles_A = [int(vehicle_count * frac) for frac in independent_distribution]
        # Distribute remaining rounding
        assigned_vehicles_A[0] += (vehicle_count - sum(assigned_vehicles_A))

        corridor_stats_A = []
        total_trip_mins_A = 0.0
        total_fuel_liters_A = 0.0

        for idx, c in enumerate(corridors):
            n_veh = assigned_vehicles_A[idx]
            total_vol = c["base_traffic"] + n_veh
            t_actual = bpr_travel_time(c["t_free_flow_mins"], total_vol, c["effective_capacity"])
            delay_mins = max(0.0, t_actual - c["t_free_flow_mins"])
            utilization = round((total_vol / c["effective_capacity"]) * 100.0, 1)

            # Fuel calculation incorporating distance, stop-and-go acceleration, and idling standstill delay
            base_fuel = c["length_km"] / 14.0
            stop_go_factor = 1.0 + min(1.5, (delay_mins / max(c["t_free_flow_mins"], 1.0)) * 0.85)
            idling_fuel = (delay_mins / 60.0) * 1.15  # 1.15 L/hr in crawl/standstill
            fuel_per_veh = (base_fuel * stop_go_factor) + idling_fuel
            corridor_fuel = fuel_per_veh * n_veh

            total_trip_mins_A += t_actual * n_veh
            total_fuel_liters_A += corridor_fuel

            corridor_stats_A.append({
                "corridor_id": c["id"],
                "corridor_name": c["name"],
                "vehicles_assigned": n_veh,
                "total_volume": total_vol,
                "capacity": c["effective_capacity"],
                "utilization_pct": utilization,
                "is_overloaded": utilization > 100.0,
                "avg_travel_time_mins": round(t_actual, 2),
                "delay_mins": round(delay_mins, 2),
                "fuel_liters": round(corridor_fuel, 2)
            })

        avg_travel_time_A = round(total_trip_mins_A / max(vehicle_count, 1), 2)
        total_delay_hours_A = round(sum(s["delay_mins"] * s["vehicles_assigned"] for s in corridor_stats_A) / 60.0, 2)
        overloaded_roads_A = sum(1 for s in corridor_stats_A if s["is_overloaded"])

        # ==========================================
        # MODE B: COORDINATED ROUTING (SmartRoute AI)
        # ==========================================
        # Balances traffic assignments inversely to current corridor marginal cost
        spare_capacities = [max(10, c["effective_capacity"] - c["base_traffic"]) for c in corridors]
        total_spare = sum(spare_capacities)
        assigned_vehicles_B = [int(vehicle_count * (sc / total_spare)) for sc in spare_capacities]
        assigned_vehicles_B[0] += (vehicle_count - sum(assigned_vehicles_B))

        corridor_stats_B = []
        total_trip_mins_B = 0.0
        total_fuel_liters_B = 0.0

        for idx, c in enumerate(corridors):
            n_veh = assigned_vehicles_B[idx]
            total_vol = c["base_traffic"] + n_veh
            t_actual = bpr_travel_time(c["t_free_flow_mins"], total_vol, c["effective_capacity"])
            delay_mins = max(0.0, t_actual - c["t_free_flow_mins"])
            utilization = round((total_vol / c["effective_capacity"]) * 100.0, 1)

            base_fuel = c["length_km"] / 14.0
            stop_go_factor = 1.0 + min(1.5, (delay_mins / max(c["t_free_flow_mins"], 1.0)) * 0.85)
            idling_fuel = (delay_mins / 60.0) * 1.15
            fuel_per_veh = (base_fuel * stop_go_factor) + idling_fuel
            corridor_fuel = fuel_per_veh * n_veh

            total_trip_mins_B += t_actual * n_veh
            total_fuel_liters_B += corridor_fuel

            corridor_stats_B.append({
                "corridor_id": c["id"],
                "corridor_name": c["name"],
                "vehicles_assigned": n_veh,
                "total_volume": total_vol,
                "capacity": c["effective_capacity"],
                "utilization_pct": utilization,
                "is_overloaded": utilization > 100.0,
                "avg_travel_time_mins": round(t_actual, 2),
                "delay_mins": round(delay_mins, 2),
                "fuel_liters": round(corridor_fuel, 2)
            })

        avg_travel_time_B = round(total_trip_mins_B / max(vehicle_count, 1), 2)
        total_delay_hours_B = round(sum(s["delay_mins"] * s["vehicles_assigned"] for s in corridor_stats_B) / 60.0, 2)
        overloaded_roads_B = sum(1 for s in corridor_stats_B if s["is_overloaded"])

        # Improvement percentages
        time_saved_pct = round(((avg_travel_time_A - avg_travel_time_B) / max(avg_travel_time_A, 0.1)) * 100.0, 1)
        delay_reduced_pct = round(((total_delay_hours_A - total_delay_hours_B) / max(total_delay_hours_A, 0.1)) * 100.0, 1)
        fuel_saved_liters = round(total_fuel_liters_A - total_fuel_liters_B, 2)
        fuel_saved_pct = round((fuel_saved_liters / max(total_fuel_liters_A, 0.1)) * 100.0, 1)
        co2_saved_kg = round(fuel_saved_liters * 2.31, 2)  # ~2.31 kg CO2 per liter petrol

        return {
            "simulation_parameters": {
                "vehicle_count": vehicle_count,
                "scenario": scenario,
                "scenario_description": weather_desc,
                "bpr_alpha": BPR_ALPHA,
                "bpr_beta": BPR_BETA
            },
            "mode_a_independent": {
                "mode_title": "Independent (Selfish) Routing",
                "description": "Drivers autonomously pick the shortest/most popular corridor without system-wide coordination, causing severe saturation on primary corridors.",
                "avg_travel_time_mins": avg_travel_time_A,
                "total_delay_hours": total_delay_hours_A,
                "overloaded_roads": overloaded_roads_A,
                "total_fuel_liters": round(total_fuel_liters_A, 2),
                "corridor_breakdown": corridor_stats_A
            },
            "mode_b_coordinated": {
                "mode_title": "Coordinated (System-Optimal) Routing",
                "description": "SmartRoute AI distributes vehicles dynamically across alternative bypasses and corridors according to spare BPR capacity, eliminating bottlenecks.",
                "avg_travel_time_mins": avg_travel_time_B,
                "total_delay_hours": total_delay_hours_B,
                "overloaded_roads": overloaded_roads_B,
                "total_fuel_liters": round(total_fuel_liters_B, 2),
                "corridor_breakdown": corridor_stats_B
            },
            "impact_comparison": {
                "travel_time_improvement_pct": time_saved_pct,
                "delay_reduction_pct": delay_reduced_pct,
                "fuel_saved_liters": fuel_saved_liters,
                "fuel_saved_pct": fuel_saved_pct,
                "co2_emissions_prevented_kg": co2_saved_kg,
                "conclusion": f"Coordinated traffic distribution reduced average travel time by {time_saved_pct}%, saved {fuel_saved_liters} L of fuel, and reduced road over-saturation from {overloaded_roads_A} corridor(s) down to {overloaded_roads_B}."
            },
            "assumptions": [
                "BPR (Bureau of Public Roads) delay formulation applied with alpha=0.15, beta=4.0.",
                "Drivers comply with distributed recommendations.",
                "Does not directly override traffic signal timings; relies on vehicle load balancing across corridors."
            ]
        }
