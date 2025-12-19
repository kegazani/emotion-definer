from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Date, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Optional

Base = declarative_base()

class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=False)
    intensity = Column(Float, nullable=False)
    sentiment_score = Column(Float, nullable=False)

class HealthData(Base):
    __tablename__ = "health_data"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    heart_rate = Column(Integer)
    steps = Column(Integer)
    sleep_hours = Column(Float)
    calories = Column(Integer)

class WatchData(Base):
    __tablename__ = "watch_data"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    heart_rate = Column(Integer)
    hrv = Column(Float)
    spo2 = Column(Integer)
    stress_level = Column(Integer)
    steps = Column(Integer)
    calories = Column(Integer)
    distance = Column(Float)
    active_minutes = Column(Integer)
    sleep_hours = Column(Float)
    sleep_quality = Column(Integer)
    body_battery = Column(Integer)
    skin_temperature = Column(Float)
    respiratory_rate = Column(Integer)

class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, nullable=False, unique=True, index=True)
    dominant_emotion = Column(String(50), nullable=False)
    avg_intensity = Column(Float, nullable=False)
    emotion_distribution = Column(JSON, nullable=False)

class EmotionLabel(Base):
    __tablename__ = "emotion_labels"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    emotion = Column(String(50), nullable=False)
    intensity = Column(Float, nullable=False)
    note = Column(Text)

class ComputedFeatures(Base):
    __tablename__ = "computed_features"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    features = Column(JSON, nullable=False)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ModelMetadata(Base):
    __tablename__ = "model_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), unique=True, nullable=False, index=True)
    model_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metrics = Column(JSON)
    feature_names = Column(JSON)
    is_active = Column(Integer, default=0)

DATABASE_URL = "sqlite:///./emotion_diary.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

