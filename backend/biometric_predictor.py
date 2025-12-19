import os
import json
import pickle
import logging
from typing import Dict, Optional
from pathlib import Path
import xgboost as xgb
import numpy as np

logger = logging.getLogger(__name__)

class BiometricPredictor:
    def __init__(self):
        self.model: Optional[xgb.Booster] = None
        self.feature_names: list = []
        self.model_loaded = False
        self.emotion_categories = [
            "радость", "грусть", "злость", "страх", "спокойствие", "тревога"
        ]
        self.model_path = Path(__file__).parent / "models" / "emotion_model.json"
        self.metadata_path = Path(__file__).parent / "models" / "model_metadata.json"
        self._load_model()
    
    def _load_model(self):
        if not self.model_path.exists():
            logger.warning(f"Model file not found at {self.model_path}. Using fallback.")
            self.model_loaded = False
            return
        
        try:
            self.model = xgb.Booster()
            self.model.load_model(str(self.model_path))
            
            if self.metadata_path.exists():
                with open(self.metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.feature_names = metadata.get('feature_names', [])
            else:
                logger.warning("Model metadata not found. Feature names may be incorrect.")
                self.feature_names = []
            
            self.model_loaded = True
            logger.info(f"Model loaded successfully from {self.model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}", exc_info=True)
            self.model_loaded = False
    
    def predict(self, features: Dict[str, float]) -> Dict[str, any]:
        if not self.model_loaded or self.model is None:
            return self._fallback_prediction()
        
        try:
            feature_vector = self._features_to_vector(features)
            
            dmatrix = xgb.DMatrix(feature_vector.reshape(1, -1), feature_names=self.feature_names if self.feature_names else None)
            
            prediction = self.model.predict(dmatrix)
            
            if prediction.ndim == 2 and prediction.shape[1] == len(self.emotion_categories):
                probabilities = prediction[0].tolist()
            elif prediction.ndim == 1 and len(prediction) == len(self.emotion_categories):
                probabilities = prediction.tolist()
            else:
                logger.warning(f"Unexpected prediction shape: {prediction.shape}")
                return self._fallback_prediction()
            
            emotion_probs = dict(zip(self.emotion_categories, probabilities))
            predicted_emotion = max(emotion_probs, key=emotion_probs.get)
            confidence = emotion_probs[predicted_emotion]
            
            return {
                "emotion": predicted_emotion,
                "confidence": float(confidence),
                "probabilities": {k: float(v) for k, v in emotion_probs.items()}
            }
        except Exception as e:
            logger.error(f"Error during prediction: {e}", exc_info=True)
            return self._fallback_prediction()
    
    def _features_to_vector(self, features: Dict[str, float]) -> np.ndarray:
        if self.feature_names:
            return np.array([features.get(name, 0.0) for name in self.feature_names])
        else:
            default_features = [
                'hr_mean', 'hr_std', 'hr_min', 'hr_max', 'hr_median', 'hr_avg_change', 'hr_max_change',
                'hrv_mean', 'hrv_std', 'hrv_min', 'hrv_max', 'hrv_median', 'hrv_avg_change',
                'spo2_mean', 'spo2_min',
                'stress_mean', 'stress_max',
                'steps_total', 'steps_mean',
                'calories_total',
                'respiratory_mean',
                'sleep_hours',
                'body_battery',
                'hour_of_day', 'hour_sin', 'hour_cos',
                'day_of_week', 'day_sin', 'day_cos',
                'data_points_count'
            ]
            return np.array([features.get(name, 0.0) for name in default_features])
    
    def _fallback_prediction(self) -> Dict[str, any]:
        default_probs = {emotion: 1.0 / len(self.emotion_categories) for emotion in self.emotion_categories}
        return {
            "emotion": "спокойствие",
            "confidence": 1.0 / len(self.emotion_categories),
            "probabilities": default_probs
        }
    
    def reload_model(self):
        self._load_model()

biometric_predictor = BiometricPredictor()

