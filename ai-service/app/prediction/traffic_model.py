"""
SmartRoute AI - Traffic Prediction Engine
Trained Machine Learning Model (RandomForestRegressor) + Deterministic Simulation Fallback
"""
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


class TrafficPredictionEngine:
    def __init__(self):
        self.model = None
        self.metrics = {
            "mae": 0.042,
            "rmse": 0.058,
            "r2": 0.912,
            "trained_samples": 2880,
            "model_type": "RandomForestRegressor (scikit-learn)"
        }
        self.is_trained = False
        self._train_initial_model()

    def _generate_synthetic_historical_data(self, n_samples=2880):
        """
        Generates realistic traffic observation data covering 30 days of 24h profiles,
        incorporating weekday/weekend patterns, weather conditions, and incident spikes.
        """
        np.random.seed(42)
        records = []
        weather_factors = {
            "clear": 1.0,
            "monsoon": 1.45,
            "heatwave": 1.15,
            "fog": 1.30
        }
        weather_list = ["clear", "monsoon", "heatwave", "fog"]
        weather_probs = [0.65, 0.15, 0.10, 0.10]

        for i in range(n_samples):
            hour = i % 24
            day_of_week = (i // 24) % 7
            is_weekend = 1 if day_of_week in [5, 6] else 0

            # Base congestion curve for Vijayawada (morning peak 8-10, evening peak 17-20)
            if not is_weekend:
                if 8 <= hour <= 10:
                    base_cong = 0.70 + 0.15 * math.sin((hour - 8) / 2 * math.pi)
                elif 17 <= hour <= 20:
                    base_cong = 0.75 + 0.18 * math.sin((hour - 17) / 3 * math.pi)
                elif 0 <= hour <= 5:
                    base_cong = 0.06 + 0.04 * (hour / 5)
                else:
                    base_cong = 0.40 + 0.15 * math.sin(hour / 4)
            else:
                if 11 <= hour <= 14:
                    base_cong = 0.55 + 0.15 * math.sin((hour - 11) / 3 * math.pi)
                elif 18 <= hour <= 21:
                    base_cong = 0.60 + 0.15 * math.sin((hour - 18) / 3 * math.pi)
                else:
                    base_cong = 0.25 + 0.10 * math.sin(hour / 6)

            weather = np.random.choice(weather_list, p=weather_probs)
            w_mult = weather_factors[weather]

            has_incident = 1 if np.random.rand() < 0.08 else 0
            incident_impact = 0.25 if has_incident else 0.0

            # Congestion index bounded [0.0, 1.0]
            noise = np.random.normal(0, 0.04)
            congestion_index = min(1.0, max(0.02, (base_cong * w_mult) + incident_impact + noise))

            # Current observed speed roughly inversely proportional to congestion
            free_flow_speed = 50.0
            current_speed = max(10.0, free_flow_speed * (1.0 - (congestion_index * 0.75)))

            records.append({
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "weather_factor": w_mult,
                "has_incident": has_incident,
                "free_flow_speed": free_flow_speed,
                "current_speed": current_speed,
                "congestion_index": congestion_index
            })

        return pd.DataFrame(records)

    def _train_initial_model(self):
        """Train scikit-learn RandomForestRegressor and calculate test metrics."""
        df = self._generate_synthetic_historical_data()
        feature_cols = [
            "hour", "day_of_week", "is_weekend", "weather_factor",
            "has_incident", "free_flow_speed", "current_speed"
        ]
        X = df[feature_cols]
        y = df["congestion_index"]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        self.metrics["mae"] = round(float(mean_absolute_error(y_test, y_pred)), 4)
        self.metrics["rmse"] = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
        self.metrics["r2"] = round(float(r2_score(y_test, y_pred)), 4)
        self.metrics["trained_samples"] = len(df)
        self.is_trained = True

    def predict_congestion(self, hour: int, day_of_week: int, current_speed: float,
                           free_flow_speed: float = 50.0, weather_factor: float = 1.0,
                           has_incident: bool = False) -> dict:
        """
        Generates predictions for next 15, 30, 45, and 60 minutes.
        """
        is_weekend = 1 if day_of_week in [5, 6] else 0
        inc_val = 1 if has_incident else 0

        # Base current prediction
        input_data = pd.DataFrame([{
            "hour": hour % 24,
            "day_of_week": day_of_week % 7,
            "is_weekend": is_weekend,
            "weather_factor": weather_factor,
            "has_incident": inc_val,
            "free_flow_speed": free_flow_speed,
            "current_speed": current_speed
        }])

        if self.model and self.is_trained:
            base_pred = float(self.model.predict(input_data)[0])
        else:
            base_pred = max(0.05, min(0.95, 1.0 - (current_speed / max(free_flow_speed, 1.0))))

        # Multi-horizon forecast trends
        horizons = {}
        for mins in [15, 30, 45, 60]:
            future_hour = (hour + (mins // 60)) % 24
            # Natural rush hour transition delta
            if 7 <= future_hour <= 9 or 16 <= future_hour <= 19:
                trend = 0.03 * (mins / 15.0)
            elif 10 <= future_hour <= 12 or 20 <= future_hour <= 22:
                trend = -0.04 * (mins / 15.0)
            else:
                trend = 0.01 * (mins / 30.0)

            # Incidents gradually dissipate after 45-60 mins
            incident_delta = -0.05 if (has_incident and mins >= 45) else 0.0

            val = max(0.05, min(0.98, base_pred + trend + incident_delta))
            severity = "LOW" if val < 0.35 else ("MODERATE" if val < 0.65 else "HEAVY")
            horizons[f"{mins}m"] = {
                "minutes_ahead": mins,
                "predicted_congestion_index": round(val, 3),
                "severity": severity,
                "predicted_speed_kmh": round(max(10.0, free_flow_speed * (1.0 - (val * 0.70))), 1)
            }

        curr_severity = "LOW" if base_pred < 0.35 else ("MODERATE" if base_pred < 0.65 else "HEAVY")

        return {
            "current_congestion_index": round(base_pred, 3),
            "severity": curr_severity,
            "predicted_speed_kmh": round(max(10.0, free_flow_speed * (1.0 - (base_pred * 0.70))), 1),
            "horizons": horizons,
            "model_metadata": self.metrics
        }
