from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np
from models import WatchData

class FeatureEngineer:
    def __init__(self):
        self.emotion_categories = [
            "радость", "грусть", "злость", "страх", "спокойствие", "тревога"
        ]
    
    def compute_features(
        self, 
        db: Session, 
        device_id: str, 
        timestamp: datetime,
        window_hours: float = 1.0
    ) -> Dict[str, float]:
        window_start = timestamp - timedelta(hours=window_hours)
        
        query = db.query(WatchData).filter(
            and_(
                WatchData.device_id == device_id,
                WatchData.timestamp >= window_start,
                WatchData.timestamp <= timestamp
            )
        ).order_by(WatchData.timestamp.asc())
        
        data_points = query.all()
        
        if not data_points:
            return self._empty_features()
        
        features = {}
        
        heart_rates = [d.heart_rate for d in data_points if d.heart_rate is not None]
        hrv_values = [d.hrv for d in data_points if d.hrv is not None]
        spo2_values = [d.spo2 for d in data_points if d.spo2 is not None]
        stress_values = [d.stress_level for d in data_points if d.stress_level is not None]
        steps_values = [d.steps for d in data_points if d.steps is not None]
        calories_values = [d.calories for d in data_points if d.calories is not None]
        respiratory_rates = [d.respiratory_rate for d in data_points if d.respiratory_rate is not None]
        
        if heart_rates:
            features['hr_mean'] = float(np.mean(heart_rates))
            features['hr_std'] = float(np.std(heart_rates))
            features['hr_min'] = float(np.min(heart_rates))
            features['hr_max'] = float(np.max(heart_rates))
            features['hr_median'] = float(np.median(heart_rates))
            
            if len(heart_rates) > 1:
                hr_diff = np.diff(heart_rates)
                features['hr_avg_change'] = float(np.mean(hr_diff))
                features['hr_max_change'] = float(np.max(np.abs(hr_diff)))
            else:
                features['hr_avg_change'] = 0.0
                features['hr_max_change'] = 0.0
        else:
            features.update({
                'hr_mean': 0.0, 'hr_std': 0.0, 'hr_min': 0.0, 'hr_max': 0.0,
                'hr_median': 0.0, 'hr_avg_change': 0.0, 'hr_max_change': 0.0
            })
        
        if hrv_values:
            features['hrv_mean'] = float(np.mean(hrv_values))
            features['hrv_std'] = float(np.std(hrv_values))
            features['hrv_min'] = float(np.min(hrv_values))
            features['hrv_max'] = float(np.max(hrv_values))
            features['hrv_median'] = float(np.median(hrv_values))
            
            if len(hrv_values) > 1:
                hrv_diff = np.diff(hrv_values)
                features['hrv_avg_change'] = float(np.mean(hrv_diff))
            else:
                features['hrv_avg_change'] = 0.0
        else:
            features.update({
                'hrv_mean': 0.0, 'hrv_std': 0.0, 'hrv_min': 0.0, 'hrv_max': 0.0,
                'hrv_median': 0.0, 'hrv_avg_change': 0.0
            })
        
        if spo2_values:
            features['spo2_mean'] = float(np.mean(spo2_values))
            features['spo2_min'] = float(np.min(spo2_values))
        else:
            features.update({'spo2_mean': 0.0, 'spo2_min': 0.0})
        
        if stress_values:
            features['stress_mean'] = float(np.mean(stress_values))
            features['stress_max'] = float(np.max(stress_values))
        else:
            features.update({'stress_mean': 0.0, 'stress_max': 0.0})
        
        if steps_values:
            features['steps_total'] = float(sum(steps_values))
            features['steps_mean'] = float(np.mean(steps_values))
        else:
            features.update({'steps_total': 0.0, 'steps_mean': 0.0})
        
        if calories_values:
            features['calories_total'] = float(sum(calories_values))
        else:
            features['calories_total'] = 0.0
        
        if respiratory_rates:
            features['respiratory_mean'] = float(np.mean(respiratory_rates))
        else:
            features['respiratory_mean'] = 0.0
        
        latest = data_points[-1]
        if latest.sleep_hours:
            features['sleep_hours'] = float(latest.sleep_hours)
        else:
            features['sleep_hours'] = 0.0
        
        if latest.body_battery:
            features['body_battery'] = float(latest.body_battery)
        else:
            features['body_battery'] = 0.0
        
        hour = timestamp.hour
        features['hour_of_day'] = float(hour)
        features['hour_sin'] = float(np.sin(2 * np.pi * hour / 24))
        features['hour_cos'] = float(np.cos(2 * np.pi * hour / 24))
        
        features['day_of_week'] = float(timestamp.weekday())
        features['day_sin'] = float(np.sin(2 * np.pi * timestamp.weekday() / 7))
        features['day_cos'] = float(np.cos(2 * np.pi * timestamp.weekday() / 7))
        
        features['data_points_count'] = float(len(data_points))
        
        return features
    
    def _empty_features(self) -> Dict[str, float]:
        return {
            'hr_mean': 0.0, 'hr_std': 0.0, 'hr_min': 0.0, 'hr_max': 0.0,
            'hr_median': 0.0, 'hr_avg_change': 0.0, 'hr_max_change': 0.0,
            'hrv_mean': 0.0, 'hrv_std': 0.0, 'hrv_min': 0.0, 'hrv_max': 0.0,
            'hrv_median': 0.0, 'hrv_avg_change': 0.0,
            'spo2_mean': 0.0, 'spo2_min': 0.0,
            'stress_mean': 0.0, 'stress_max': 0.0,
            'steps_total': 0.0, 'steps_mean': 0.0,
            'calories_total': 0.0,
            'respiratory_mean': 0.0,
            'sleep_hours': 0.0,
            'body_battery': 0.0,
            'hour_of_day': 0.0, 'hour_sin': 0.0, 'hour_cos': 0.0,
            'day_of_week': 0.0, 'day_sin': 0.0, 'day_cos': 0.0,
            'data_points_count': 0.0
        }

feature_engineer = FeatureEngineer()

