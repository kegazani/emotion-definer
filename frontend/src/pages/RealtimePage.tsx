import { useState, useEffect } from 'react'
import { watchApi, WatchData, emotionApi, EmotionPrediction } from '../api/client'
import GlassCard from '../components/GlassCard'
import EmotionBadge from '../components/EmotionBadge'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import './RealtimePage.css'

function RealtimePage() {
  const [latestData, setLatestData] = useState<WatchData | null>(null)
  const [prediction, setPrediction] = useState<EmotionPrediction | null>(null)
  const [hrHistory, setHrHistory] = useState<Array<{ time: string; value: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [latest, pred] = await Promise.all([
        watchApi.getLatestWatchData(),
        emotionApi.predictEmotion()
      ])
      
      setLatestData(latest)
      setPrediction(pred)
      
      if (latest?.heart_rate) {
        setHrHistory(prev => {
          const newHistory = [
            ...prev,
            { time: format(new Date(), 'HH:mm:ss'), value: latest.heart_rate! }
          ]
          return newHistory.slice(-20)
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(timeStr), 'HH:mm')
    } catch {
      return timeStr
    }
  }

  if (loading && !latestData) {
    return (
      <div className="realtime-page">
        <GlassCard>
          <p>Загрузка данных...</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="realtime-page">
      <GlassCard className="realtime-header-card">
        <h2 className="page-title">Текущее состояние</h2>
        <div className="last-update">
          Последнее обновление: {latestData ? formatTime(latestData.timestamp) : '—'}
        </div>
      </GlassCard>

      {prediction && (
        <GlassCard className="prediction-card">
          <h3 className="section-title">Предсказание эмоции</h3>
          <div className="prediction-main">
            <EmotionBadge emotion={prediction.emotion} intensity={prediction.confidence} />
            <div className="prediction-info">
              <div className="prediction-confidence">
                Уверенность: {(prediction.confidence * 100).toFixed(0)}%
              </div>
              <div className="prediction-probabilities">
                {Object.entries(prediction.probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([emotion, prob]) => (
                    <div key={emotion} className="prob-item">
                      <span className="prob-emotion">{emotion}:</span>
                      <span className="prob-value">{(prob * 100).toFixed(0)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {latestData && (
        <div className="metrics-grid">
          {latestData.heart_rate && (
            <GlassCard className="metric-card heart">
              <div className="metric-header">
                <span className="metric-icon">❤️</span>
                <span className="metric-label">Пульс</span>
              </div>
              <div className="metric-value-large">{latestData.heart_rate}</div>
              <div className="metric-unit">уд/мин</div>
            </GlassCard>
          )}

          {latestData.hrv && (
            <GlassCard className="metric-card hrv">
              <div className="metric-header">
                <span className="metric-icon">💓</span>
                <span className="metric-label">HRV</span>
              </div>
              <div className="metric-value-large">{latestData.hrv.toFixed(0)}</div>
              <div className="metric-unit">мс</div>
            </GlassCard>
          )}

          {latestData.spo2 && (
            <GlassCard className="metric-card oxygen">
              <div className="metric-header">
                <span className="metric-icon">🫁</span>
                <span className="metric-label">SpO2</span>
              </div>
              <div className="metric-value-large">{latestData.spo2}%</div>
              <div className="metric-unit">кислород</div>
            </GlassCard>
          )}

          {latestData.stress_level !== undefined && latestData.stress_level !== null && (
            <GlassCard className="metric-card stress">
              <div className="metric-header">
                <span className="metric-icon">🧠</span>
                <span className="metric-label">Стресс</span>
              </div>
              <div className="metric-value-large">{latestData.stress_level}</div>
              <div className="metric-unit">уровень</div>
            </GlassCard>
          )}

          {latestData.body_battery !== undefined && latestData.body_battery !== null && (
            <GlassCard className="metric-card battery">
              <div className="metric-header">
                <span className="metric-icon">⚡</span>
                <span className="metric-label">Энергия</span>
              </div>
              <div className="metric-value-large">{latestData.body_battery}%</div>
              <div className="metric-unit">батарея</div>
            </GlassCard>
          )}

          {latestData.respiratory_rate && (
            <GlassCard className="metric-card respiratory">
              <div className="metric-header">
                <span className="metric-icon">🌬️</span>
                <span className="metric-label">Дыхание</span>
              </div>
              <div className="metric-value-large">{latestData.respiratory_rate}</div>
              <div className="metric-unit">вдох/мин</div>
            </GlassCard>
          )}

          {latestData.skin_temperature && (
            <GlassCard className="metric-card temp">
              <div className="metric-header">
                <span className="metric-icon">🌡️</span>
                <span className="metric-label">Температура</span>
              </div>
              <div className="metric-value-large">{latestData.skin_temperature.toFixed(1)}°</div>
              <div className="metric-unit">тело</div>
            </GlassCard>
          )}

          {latestData.steps !== undefined && latestData.steps !== null && (
            <GlassCard className="metric-card steps">
              <div className="metric-header">
                <span className="metric-icon">👣</span>
                <span className="metric-label">Шаги</span>
              </div>
              <div className="metric-value-large">{latestData.steps.toLocaleString()}</div>
              <div className="metric-unit">сегодня</div>
            </GlassCard>
          )}
        </div>
      )}

      {hrHistory.length > 1 && (
        <GlassCard className="chart-card">
          <h3 className="section-title">Пульс (последние 20 измерений)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={hrHistory}>
              <defs>
                <linearGradient id="hrRealtimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FF2D55" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#FF2D55" 
                fill="url(#hrRealtimeGradient)" 
                strokeWidth={2}
                dot={{ fill: '#FF2D55', r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {(!latestData || Object.keys(latestData).length <= 3) && (
        <GlassCard className="empty-state-card">
          <div className="empty-icon">⌚</div>
          <h3>Нет данных с часов</h3>
          <p>Данные появятся здесь, когда часы начнут отправлять информацию</p>
          <p className="hint">Обновление каждые 10 секунд</p>
        </GlassCard>
      )}
    </div>
  )
}

export default RealtimePage

