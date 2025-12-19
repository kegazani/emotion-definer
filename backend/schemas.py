from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, Dict, List

class DiaryEntryCreate(BaseModel):
    content: str

class DiaryEntryResponse(BaseModel):
    id: int
    created_at: datetime
    content: str
    emotion: str
    intensity: float
    sentiment_score: float
    
    class Config:
        from_attributes = True

class HealthDataCreate(BaseModel):
    heart_rate: Optional[int] = None
    steps: Optional[int] = None
    sleep_hours: Optional[float] = None
    calories: Optional[int] = None

class HealthDataResponse(BaseModel):
    id: int
    timestamp: datetime
    heart_rate: Optional[int]
    steps: Optional[int]
    sleep_hours: Optional[float]
    calories: Optional[int]
    
    class Config:
        from_attributes = True

class WatchDataCreate(BaseModel):
    device_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    heart_rate: Optional[int] = None
    hrv: Optional[float] = None
    spo2: Optional[int] = None
    stress_level: Optional[int] = None
    steps: Optional[int] = None
    calories: Optional[int] = None
    distance: Optional[float] = None
    active_minutes: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    body_battery: Optional[int] = None
    skin_temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None

class WatchDataResponse(BaseModel):
    id: int
    device_id: Optional[str]
    timestamp: datetime
    heart_rate: Optional[int]
    hrv: Optional[float]
    spo2: Optional[int]
    stress_level: Optional[int]
    steps: Optional[int]
    calories: Optional[int]
    distance: Optional[float]
    active_minutes: Optional[int]
    sleep_hours: Optional[float]
    sleep_quality: Optional[int]
    body_battery: Optional[int]
    skin_temperature: Optional[float]
    respiratory_rate: Optional[int]
    
    class Config:
        from_attributes = True

class WatchDataBatch(BaseModel):
    data: List[WatchDataCreate]

class WatchAnalytics(BaseModel):
    period_start: datetime
    period_end: datetime
    total_records: int
    avg_heart_rate: Optional[float]
    min_heart_rate: Optional[int]
    max_heart_rate: Optional[int]
    avg_hrv: Optional[float]
    avg_spo2: Optional[float]
    avg_stress_level: Optional[float]
    total_steps: int
    total_calories: int
    total_distance: float
    total_active_minutes: int
    avg_sleep_hours: Optional[float]
    avg_sleep_quality: Optional[float]
    avg_body_battery: Optional[float]
    heart_rate_trend: List[Dict]
    stress_trend: List[Dict]
    activity_trend: List[Dict]

class DailyStatsResponse(BaseModel):
    date: date
    total_entries: int
    dominant_emotion: str
    avg_intensity: float
    emotion_distribution: Dict[str, int]

class WeeklyStatsResponse(BaseModel):
    week_start: date
    week_end: date
    total_entries: int
    daily_stats: List[DailyStatsResponse]
    emotion_trend: Dict[str, List[float]]

class MonthlyStatsResponse(BaseModel):
    month: int
    year: int
    total_entries: int
    weekly_stats: List[WeeklyStatsResponse]
    emotion_patterns: Dict[str, float]

class EmotionLabelCreate(BaseModel):
    device_id: Optional[str] = None
    emotion: str
    intensity: float
    note: Optional[str] = None

class EmotionLabelResponse(BaseModel):
    id: int
    device_id: Optional[str]
    timestamp: datetime
    emotion: str
    intensity: float
    note: Optional[str]
    
    class Config:
        from_attributes = True

class EmotionPredictionResponse(BaseModel):
    emotion: str
    confidence: float
    probabilities: Dict[str, float]
    timestamp: datetime

