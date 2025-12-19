import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report
from sqlalchemy.orm import Session
from models import init_db, get_db, EmotionLabel, WatchData, ModelMetadata
from feature_engineering import feature_engineer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPipeline:
    def __init__(self):
        self.emotion_categories = [
            "радость", "грусть", "злость", "страх", "спокойствие", "тревога"
        ]
        self.emotion_to_index = {emotion: idx for idx, emotion in enumerate(self.emotion_categories)}
        self.models_dir = Path(__file__).parent / "models"
        self.models_dir.mkdir(exist_ok=True)
    
    def build_dataset(self, db: Session, min_samples: int = 50) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        labels = db.query(EmotionLabel).order_by(EmotionLabel.timestamp.asc()).all()
        
        if len(labels) < min_samples:
            raise ValueError(
                f"Недостаточно данных для обучения. "
                f"Найдено {len(labels)} примеров, требуется минимум {min_samples}."
            )
        
        logger.info(f"Найдено {len(labels)} размеченных примеров")
        
        X_list = []
        y_list = []
        feature_names_list = []
        
        for label in labels:
            try:
                device_id = label.device_id or "default"
                timestamp = label.timestamp
                
                features = feature_engineer.compute_features(db, device_id, timestamp)
                
                if not feature_names_list:
                    feature_names_list = list(features.keys())
                
                feature_vector = np.array([features[name] for name in feature_names_list])
                
                emotion_idx = self.emotion_to_index.get(label.emotion, 0)
                
                X_list.append(feature_vector)
                y_list.append(emotion_idx)
            except Exception as e:
                logger.warning(f"Ошибка обработки примера ID={label.id}: {e}")
                continue
        
        X = np.array(X_list)
        y = np.array(y_list)
        
        logger.info(f"Датасет собран: {X.shape[0]} примеров, {X.shape[1]} признаков")
        logger.info(f"Распределение классов: {np.bincount(y)}")
        
        return X, y, feature_names_list
    
    def train_model(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: List[str],
        test_size: float = 0.2,
        random_state: int = 42
    ) -> dict:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        logger.info(f"Train set: {X_train.shape[0]} examples")
        logger.info(f"Test set: {X_test.shape[0]} examples")
        
        params = {
            'objective': 'multi:softprob',
            'num_class': len(self.emotion_categories),
            'max_depth': 6,
            'learning_rate': 0.1,
            'n_estimators': 100,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': random_state,
            'eval_metric': 'mlogloss'
        }
        
        dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_names)
        dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_names)
        
        eval_list = [(dtrain, 'train'), (dtest, 'test')]
        
        model = xgb.train(
            params,
            dtrain,
            num_boost_round=params['n_estimators'],
            evals=eval_list,
            early_stopping_rounds=10,
            verbose_eval=False
        )
        
        y_pred = model.predict(dtest)
        y_pred_classes = np.argmax(y_pred, axis=1)
        
        accuracy = accuracy_score(y_test, y_pred_classes)
        f1 = f1_score(y_test, y_pred_classes, average='weighted')
        
        logger.info(f"Test Accuracy: {accuracy:.4f}")
        logger.info(f"Test F1-score (weighted): {f1:.4f}")
        
        cm = confusion_matrix(y_test, y_pred_classes)
        logger.info("Confusion Matrix:")
        logger.info(f"\n{cm}")
        
        report = classification_report(
            y_test, 
            y_pred_classes, 
            target_names=self.emotion_categories,
            output_dict=True
        )
        logger.info("\nClassification Report:")
        logger.info(f"\n{classification_report(y_test, y_pred_classes, target_names=self.emotion_categories)}")
        
        cv_scores = cross_val_score(
            xgb.XGBClassifier(**params),
            X_train, y_train,
            cv=5,
            scoring='accuracy'
        )
        logger.info(f"Cross-validation accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        return {
            'model': model,
            'accuracy': float(accuracy),
            'f1_score': float(f1),
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std()),
            'confusion_matrix': cm.tolist(),
            'classification_report': report,
            'feature_names': feature_names
        }
    
    def save_model(self, training_result: dict, version: str = None):
        if version is None:
            version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        model = training_result['model']
        feature_names = training_result['feature_names']
        
        model_path = self.models_dir / f"emotion_model.json"
        metadata_path = self.models_dir / "model_metadata.json"
        
        model.save_model(str(model_path))
        logger.info(f"Model saved to {model_path}")
        
        metadata = {
            'version': version,
            'created_at': datetime.now().isoformat(),
            'accuracy': training_result['accuracy'],
            'f1_score': training_result['f1_score'],
            'cv_mean': training_result['cv_mean'],
            'cv_std': training_result['cv_std'],
            'feature_names': feature_names,
            'emotion_categories': self.emotion_categories
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Metadata saved to {metadata_path}")
        
        return version
    
    def save_to_db(self, db: Session, version: str, training_result: dict):
        model_path = str(self.models_dir / "emotion_model.json")
        
        db_metadata = ModelMetadata(
            version=version,
            model_path=model_path,
            created_at=datetime.utcnow(),
            metrics={
                'accuracy': training_result['accuracy'],
                'f1_score': training_result['f1_score'],
                'cv_mean': training_result['cv_mean'],
                'cv_std': training_result['cv_std']
            },
            feature_names=training_result['feature_names'],
            is_active=1
        )
        
        db.query(ModelMetadata).filter(ModelMetadata.is_active == 1).update({'is_active': 0})
        
        db.add(db_metadata)
        db.commit()
        
        logger.info(f"Model metadata saved to database: version={version}")
    
    def run_training(self, min_samples: int = 50, version: str = None):
        init_db()
        db = next(get_db())
        
        try:
            logger.info("Starting ML pipeline training...")
            
            X, y, feature_names = self.build_dataset(db, min_samples)
            
            training_result = self.train_model(X, y, feature_names)
            
            saved_version = self.save_model(training_result, version)
            
            self.save_to_db(db, saved_version, training_result)
            
            logger.info(f"Training completed successfully! Version: {saved_version}")
            
            return training_result
        except Exception as e:
            logger.error(f"Training failed: {e}", exc_info=True)
            raise
        finally:
            db.close()

if __name__ == "__main__":
    pipeline = MLPipeline()
    pipeline.run_training(min_samples=50)

