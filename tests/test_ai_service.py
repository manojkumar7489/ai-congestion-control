"""
SmartRoute AI - Unit & Integration Test Suite
Built with Python's native unittest framework
"""
import sys
import os
import unittest

# Ensure ai-service is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../ai-service')))

from app.prediction.traffic_model import TrafficPredictionEngine
from app.optimization.route_optimizer import RouteOptimizer, VEHICLE_PROFILES
from app.simulation.coordinated_distribution import CoordinatedTrafficSimulator, bpr_travel_time


class TestTrafficPredictionEngine(unittest.TestCase):
    def setUp(self):
        self.engine = TrafficPredictionEngine()

    def test_model_training_and_metrics(self):
        self.assertTrue(self.engine.is_trained)
        self.assertIn("mae", self.engine.metrics)
        self.assertIn("rmse", self.engine.metrics)
        self.assertLess(self.engine.metrics["mae"], 0.15, "MAE should be within reasonable bounds")
        self.assertLess(self.engine.metrics["rmse"], 0.20, "RMSE should be within reasonable bounds")

    def test_multi_horizon_predictions(self):
        result = self.engine.predict_congestion(hour=9, day_of_week=1, current_speed=20.0, free_flow_speed=50.0)
        self.assertIn("current_congestion_index", result)
        self.assertIn("horizons", result)
        for h in ["15m", "30m", "45m", "60m"]:
            self.assertIn(h, result["horizons"])
            self.assertGreater(result["horizons"][h]["predicted_congestion_index"], 0.0)
            self.assertLessEqual(result["horizons"][h]["predicted_congestion_index"], 1.0)


class TestRouteOptimizer(unittest.TestCase):
    def setUp(self):
        self.optimizer = RouteOptimizer()

    def test_fuel_consumption_by_vehicle_type(self):
        dist = 10.0
        dur = 20.0
        cong = 0.5
        motorcycle_fuel = self.optimizer.calculate_fuel_consumption(dist, dur, cong, "motorcycle")
        sedan_fuel = self.optimizer.calculate_fuel_consumption(dist, dur, cong, "sedan")
        suv_fuel = self.optimizer.calculate_fuel_consumption(dist, dur, cong, "suv")

        # Motorcycle should consume less fuel than Sedan, which consumes less than SUV
        self.assertLess(motorcycle_fuel["total_fuel_liters"], sedan_fuel["total_fuel_liters"])
        self.assertLess(sedan_fuel["total_fuel_liters"], suv_fuel["total_fuel_liters"])

    def test_route_scoring_and_ranking(self):
        candidate_routes = [
            {"id": "r1", "name": "Short but Jammed", "distance_km": 5.0, "duration_mins": 35.0, "congestion_index": 0.85},
            {"id": "r2", "name": "Optimal Bypass", "distance_km": 7.0, "duration_mins": 14.0, "congestion_index": 0.20},
            {"id": "r3", "name": "Long Highway", "distance_km": 12.0, "duration_mins": 18.0, "congestion_index": 0.15}
        ]

        ranked = self.optimizer.optimize_routes(candidate_routes, vehicle_type="sedan")
        self.assertEqual(len(ranked), 3)
        # Optimal bypass (r2) should win over heavily congested route (r1) despite being 2km longer
        self.assertEqual(ranked[0]["id"], "r2")
        self.assertTrue(ranked[0]["is_recommended"])
        self.assertIn("Recommended", ranked[0]["recommendation_explanation"])


class TestCoordinatedSimulation(unittest.TestCase):
    def setUp(self):
        self.sim = CoordinatedTrafficSimulator()

    def test_bpr_latency_formula(self):
        t0 = 10.0
        # When volume is 0, time = t0
        self.assertAlmostEqual(bpr_travel_time(t0, 0, 500), t0)
        # When volume = capacity, time = t0 * (1 + 0.15 * 1^4) = 1.15 * t0
        self.assertAlmostEqual(bpr_travel_time(t0, 500, 500), 11.5)
        # When volume exceeds capacity (e.g. 1.5x), time escalates exponentially
        self.assertGreater(bpr_travel_time(t0, 750, 500), 15.0)

    def test_independent_vs_coordinated_modes(self):
        res = self.sim.run_simulation(vehicle_count=350, scenario="rush_hour")
        time_A = res["mode_a_independent"]["avg_travel_time_mins"]
        time_B = res["mode_b_coordinated"]["avg_travel_time_mins"]

        # Coordinated routing should yield lower or equal average travel time
        self.assertLess(time_B, time_A)
        self.assertGreater(res["impact_comparison"]["travel_time_improvement_pct"], 0.0)
        self.assertGreater(res["impact_comparison"]["fuel_saved_liters"], 0.0)


if __name__ == "__main__":
    unittest.main()
