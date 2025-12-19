from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional
import json
import logging

from models import init_db, get_db, DiaryEntry, HealthData, DailyReport, WatchData, EmotionLabel
from schemas import (
    DiaryEntryCreate, DiaryEntryResponse,
    HealthDataCreate, HealthDataResponse,
    DailyStatsResponse, WeeklyStatsResponse, MonthlyStatsResponse,
    WatchDataCreate, WatchDataResponse, WatchDataBatch, WatchAnalytics,
    EmotionLabelCreate, EmotionLabelResponse, EmotionPredictionResponse
)
from emotion_analyzer import emotion_analyzer
from feature_engineering import feature_engineer
from biometric_predictor import biometric_predictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Emotion Diary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/api/entries", response_model=DiaryEntryResponse)
async def create_entry(entry: DiaryEntryCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Анализ текста: {entry.content[:50]}...")
        analysis = emotion_analyzer.analyze(entry.content)
        logger.info(f"Результат анализа: {analysis}")
        
        db_entry = DiaryEntry(
            content=entry.content,
            emotion=analysis["emotion"],
            intensity=analysis["intensity"],
            sentiment_score=analysis["sentiment_score"]
        )
        
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        logger.info(f"Запись создана: ID={db_entry.id}")
        return db_entry
    except Exception as e:
        logger.error(f"Ошибка создания записи: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения записи: {str(e)}")

@app.get("/api/entries", response_model=List[DiaryEntryResponse])
async def get_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DiaryEntry)
    
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(DiaryEntry.created_at >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(DiaryEntry.created_at <= end)
    
    entries = query.order_by(DiaryEntry.created_at.desc()).all()
    return entries

@app.get("/api/stats/daily", response_model=DailyStatsResponse)
async def get_daily_stats(target_date: Optional[str] = None, db: Session = Depends(get_db)):
    if target_date:
        target = date.fromisoformat(target_date)
    else:
        target = date.today()
    
    start_datetime = datetime.combine(target, datetime.min.time())
    end_datetime = datetime.combine(target, datetime.max.time())
    
    entries = db.query(DiaryEntry).filter(
        and_(
            DiaryEntry.created_at >= start_datetime,
            DiaryEntry.created_at <= end_datetime
        )
    ).all()
    
    if not entries:
        return DailyStatsResponse(
            date=target,
            total_entries=0,
            dominant_emotion="нет данных",
            avg_intensity=0.0,
            emotion_distribution={}
        )
    
    emotion_counts = {}
    total_intensity = 0.0
    
    for entry in entries:
        emotion_counts[entry.emotion] = emotion_counts.get(entry.emotion, 0) + 1
        total_intensity += entry.intensity
    
    dominant_emotion = max(emotion_counts, key=emotion_counts.get)
    avg_intensity = total_intensity / len(entries)
    
    return DailyStatsResponse(
        date=target,
        total_entries=len(entries),
        dominant_emotion=dominant_emotion,
        avg_intensity=avg_intensity,
        emotion_distribution=emotion_counts
    )

@app.get("/api/stats/weekly", response_model=WeeklyStatsResponse)
async def get_weekly_stats(target_date: Optional[str] = None, db: Session = Depends(get_db)):
    if target_date:
        target = date.fromisoformat(target_date)
    else:
        target = date.today()
    
    week_start = target - timedelta(days=target.weekday())
    week_end = week_start + timedelta(days=6)
    
    daily_stats_list = []
    emotion_trend = {}
    
    for i in range(7):
        current_date = week_start + timedelta(days=i)
        daily_stat = await get_daily_stats(current_date.isoformat(), db)
        daily_stats_list.append(daily_stat)
        
        for emotion, count in daily_stat.emotion_distribution.items():
            if emotion not in emotion_trend:
                emotion_trend[emotion] = [0.0] * 7
            emotion_trend[emotion][i] = count
    
    total_entries = sum(stat.total_entries for stat in daily_stats_list)
    
    return WeeklyStatsResponse(
        week_start=week_start,
        week_end=week_end,
        total_entries=total_entries,
        daily_stats=daily_stats_list,
        emotion_trend=emotion_trend
    )

@app.get("/api/stats/monthly", response_model=MonthlyStatsResponse)
async def get_monthly_stats(target_date: Optional[str] = None, db: Session = Depends(get_db)):
    if target_date:
        target = date.fromisoformat(target_date)
    else:
        target = date.today()
    
    month_start = date(target.year, target.month, 1)
    if target.month == 12:
        month_end = date(target.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(target.year, target.month + 1, 1) - timedelta(days=1)
    
    weekly_stats_list = []
    current_date = month_start
    
    while current_date <= month_end:
        week_end_date = min(current_date + timedelta(days=6), month_end)
        week_stat = await get_weekly_stats(current_date.isoformat(), db)
        weekly_stats_list.append(week_stat)
        current_date += timedelta(days=7)
    
    total_entries = sum(week.total_entries for week in weekly_stats_list)
    
    emotion_patterns = {}
    emotion_totals = {}
    
    for week_stat in weekly_stats_list:
        for daily_stat in week_stat.daily_stats:
            for emotion, count in daily_stat.emotion_distribution.items():
                emotion_totals[emotion] = emotion_totals.get(emotion, 0) + count
    
    total_emotion_count = sum(emotion_totals.values())
    if total_emotion_count > 0:
        for emotion, count in emotion_totals.items():
            emotion_patterns[emotion] = count / total_emotion_count
    
    return MonthlyStatsResponse(
        month=target.month,
        year=target.year,
        total_entries=total_entries,
        weekly_stats=weekly_stats_list,
        emotion_patterns=emotion_patterns
    )

@app.post("/api/health-data", response_model=HealthDataResponse)
async def create_health_data(health_data: HealthDataCreate, db: Session = Depends(get_db)):
    db_health = HealthData(
        heart_rate=health_data.heart_rate,
        steps=health_data.steps,
        sleep_hours=health_data.sleep_hours,
        calories=health_data.calories
    )
    
    db.add(db_health)
    db.commit()
    db.refresh(db_health)
    
    return db_health

@app.get("/api/health-data", response_model=List[HealthDataResponse])
async def get_health_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(HealthData)
    
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(HealthData.timestamp >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(HealthData.timestamp <= end)
    
    health_data = query.order_by(HealthData.timestamp.desc()).all()
    return health_data

@app.post("/api/watch", response_model=WatchDataResponse)
async def create_watch_data(data: WatchDataCreate, db: Session = Depends(get_db)):
    try:
        logger.info("=" * 50)
        logger.info("📥 Получены данные с часов")
        logger.info(f"   Device ID: {data.device_id}")
        logger.info(f"   Timestamp: {data.timestamp}")
        
        data_dict = data.model_dump(exclude_none=True)
        logger.info("   Данные:")
        for key, value in data_dict.items():
            if key not in ['device_id', 'timestamp']:
                logger.info(f"     - {key}: {value}")
        
        db_watch = WatchData(
            device_id=data.device_id,
            timestamp=data.timestamp or datetime.utcnow(),
            heart_rate=data.heart_rate,
            hrv=data.hrv,
            spo2=data.spo2,
            stress_level=data.stress_level,
            steps=data.steps,
            calories=data.calories,
            distance=data.distance,
            active_minutes=data.active_minutes,
            sleep_hours=data.sleep_hours,
            sleep_quality=data.sleep_quality,
            body_battery=data.body_battery,
            skin_temperature=data.skin_temperature,
            respiratory_rate=data.respiratory_rate
        )
        db.add(db_watch)
        db.commit()
        db.refresh(db_watch)
        logger.info(f"✅ Данные сохранены в БД: ID={db_watch.id}")
        logger.info("=" * 50)
        return db_watch
    except Exception as e:
        logger.error(f"❌ Ошибка сохранения данных: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/watch/batch", response_model=List[WatchDataResponse])
async def create_watch_data_batch(batch: WatchDataBatch, db: Session = Depends(get_db)):
    try:
        results = []
        for data in batch.data:
            db_watch = WatchData(
                device_id=data.device_id,
                timestamp=data.timestamp or datetime.utcnow(),
                heart_rate=data.heart_rate,
                hrv=data.hrv,
                spo2=data.spo2,
                stress_level=data.stress_level,
                steps=data.steps,
                calories=data.calories,
                distance=data.distance,
                active_minutes=data.active_minutes,
                sleep_hours=data.sleep_hours,
                sleep_quality=data.sleep_quality,
                body_battery=data.body_battery,
                skin_temperature=data.skin_temperature,
                respiratory_rate=data.respiratory_rate
            )
            db.add(db_watch)
            results.append(db_watch)
        db.commit()
        for r in results:
            db.refresh(r)
        logger.info(f"Batch watch data created: {len(results)} records")
        return results
    except Exception as e:
        logger.error(f"Error creating batch watch data: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/watch", response_model=List[WatchDataResponse])
async def get_watch_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    device_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(WatchData)
    
    if device_id:
        query = query.filter(WatchData.device_id == device_id)
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(WatchData.timestamp >= start)
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(WatchData.timestamp <= end)
    
    return query.order_by(WatchData.timestamp.desc()).limit(limit).all()

@app.get("/api/watch/analytics", response_model=WatchAnalytics)
async def get_watch_analytics(
    period: str = "day",
    target_date: Optional[str] = None,
    device_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if target_date:
        target = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
    else:
        target = datetime.utcnow()
    
    if period == "day":
        start = datetime.combine(target.date(), datetime.min.time())
        end = datetime.combine(target.date(), datetime.max.time())
    elif period == "week":
        start = datetime.combine(target.date() - timedelta(days=target.weekday()), datetime.min.time())
        end = datetime.combine(start.date() + timedelta(days=6), datetime.max.time())
    else:
        start = datetime.combine(date(target.year, target.month, 1), datetime.min.time())
        if target.month == 12:
            end = datetime.combine(date(target.year + 1, 1, 1) - timedelta(days=1), datetime.max.time())
        else:
            end = datetime.combine(date(target.year, target.month + 1, 1) - timedelta(days=1), datetime.max.time())
    
    query = db.query(WatchData).filter(
        and_(WatchData.timestamp >= start, WatchData.timestamp <= end)
    )
    if device_id:
        query = query.filter(WatchData.device_id == device_id)
    
    data = query.order_by(WatchData.timestamp.asc()).all()
    
    if not data:
        return WatchAnalytics(
            period_start=start,
            period_end=end,
            total_records=0,
            avg_heart_rate=None,
            min_heart_rate=None,
            max_heart_rate=None,
            avg_hrv=None,
            avg_spo2=None,
            avg_stress_level=None,
            total_steps=0,
            total_calories=0,
            total_distance=0.0,
            total_active_minutes=0,
            avg_sleep_hours=None,
            avg_sleep_quality=None,
            avg_body_battery=None,
            heart_rate_trend=[],
            stress_trend=[],
            activity_trend=[]
        )
    
    hr_values = [d.heart_rate for d in data if d.heart_rate]
    hrv_values = [d.hrv for d in data if d.hrv]
    spo2_values = [d.spo2 for d in data if d.spo2]
    stress_values = [d.stress_level for d in data if d.stress_level]
    sleep_values = [d.sleep_hours for d in data if d.sleep_hours]
    sleep_quality_values = [d.sleep_quality for d in data if d.sleep_quality]
    battery_values = [d.body_battery for d in data if d.body_battery]
    
    heart_rate_trend = [
        {"time": d.timestamp.isoformat(), "value": d.heart_rate}
        for d in data if d.heart_rate
    ]
    stress_trend = [
        {"time": d.timestamp.isoformat(), "value": d.stress_level}
        for d in data if d.stress_level
    ]
    activity_trend = [
        {"time": d.timestamp.isoformat(), "steps": d.steps or 0, "calories": d.calories or 0}
        for d in data
    ]
    
    return WatchAnalytics(
        period_start=start,
        period_end=end,
        total_records=len(data),
        avg_heart_rate=sum(hr_values) / len(hr_values) if hr_values else None,
        min_heart_rate=min(hr_values) if hr_values else None,
        max_heart_rate=max(hr_values) if hr_values else None,
        avg_hrv=sum(hrv_values) / len(hrv_values) if hrv_values else None,
        avg_spo2=sum(spo2_values) / len(spo2_values) if spo2_values else None,
        avg_stress_level=sum(stress_values) / len(stress_values) if stress_values else None,
        total_steps=sum(d.steps or 0 for d in data),
        total_calories=sum(d.calories or 0 for d in data),
        total_distance=sum(d.distance or 0 for d in data),
        total_active_minutes=sum(d.active_minutes or 0 for d in data),
        avg_sleep_hours=sum(sleep_values) / len(sleep_values) if sleep_values else None,
        avg_sleep_quality=sum(sleep_quality_values) / len(sleep_quality_values) if sleep_quality_values else None,
        avg_body_battery=sum(battery_values) / len(battery_values) if battery_values else None,
        heart_rate_trend=heart_rate_trend[-50:],
        stress_trend=stress_trend[-50:],
        activity_trend=activity_trend[-50:]
    )

@app.get("/api/watch/latest", response_model=Optional[WatchDataResponse])
async def get_latest_watch_data(
    device_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(WatchData)
    if device_id:
        query = query.filter(WatchData.device_id == device_id)
    return query.order_by(WatchData.timestamp.desc()).first()

@app.post("/api/emotions", response_model=EmotionLabelResponse)
async def create_emotion_label(
    label: EmotionLabelCreate, 
    db: Session = Depends(get_db)
):
    try:
        device_id = label.device_id or "default"
        
        db_label = EmotionLabel(
            device_id=device_id,
            timestamp=datetime.utcnow(),
            emotion=label.emotion,
            intensity=label.intensity,
            note=label.note
        )
        
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        
        logger.info(f"Emotion label created: ID={db_label.id}, emotion={label.emotion}")
        return db_label
    except Exception as e:
        logger.error(f"Error creating emotion label: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving emotion label: {str(e)}")

@app.get("/api/emotions", response_model=List[EmotionLabelResponse])
async def get_emotion_labels(
    device_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(EmotionLabel)
    
    if device_id:
        query = query.filter(EmotionLabel.device_id == device_id)
    
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(EmotionLabel.timestamp >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(EmotionLabel.timestamp <= end)
    
    labels = query.order_by(EmotionLabel.timestamp.desc()).limit(limit).all()
    return labels

@app.get("/api/emotions/predict", response_model=EmotionPredictionResponse)
async def predict_emotion(
    device_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        device_id = device_id or "default"
        timestamp = datetime.utcnow()
        
        features = feature_engineer.compute_features(db, device_id, timestamp)
        prediction = biometric_predictor.predict(features)
        
        return EmotionPredictionResponse(
            emotion=prediction["emotion"],
            confidence=prediction["confidence"],
            probabilities=prediction["probabilities"],
            timestamp=timestamp
        )
    except Exception as e:
        logger.error(f"Error predicting emotion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error predicting emotion: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Emotion Diary API", "version": "2.0", "watch_api": True, "ml_api": True}

