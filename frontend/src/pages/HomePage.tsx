import { useState, useEffect } from 'react'
import { statsApi, healthApi, DailyStats, HealthData } from '../api/client'
import GlassCard from '../components/GlassCard'
import EmotionBadge from '../components/EmotionBadge'
import { format } from 'date-fns'
import './HomePage.css'

function HomePage() {
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [healthData, setHealthData] = useState<HealthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [stats, health] = await Promise.all([
        statsApi.getDailyStats(),
        healthApi.getHealthData()
      ])
      setDailyStats(stats)
      setHealthData(health.slice(0, 5))
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="home-page">
        <GlassCard>
          <p>Загрузка...</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-grid">
        <GlassCard className="stats-card">
          <h2 className="card-title">Сегодня</h2>
          {dailyStats && dailyStats.total_entries > 0 ? (
            <div className="stats-content">
              <div className="dominant-emotion">
                <span className="label">Преобладающая эмоция:</span>
                <EmotionBadge emotion={dailyStats.dominant_emotion} />
              </div>
              <div className="stat-item">
                <span className="stat-value">{dailyStats.total_entries}</span>
                <span className="stat-label">записей</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {(dailyStats.avg_intensity * 100).toFixed(0)}%
                </span>
                <span className="stat-label">интенсивность</span>
              </div>
              <div className="emotion-distribution">
                <h3>Распределение эмоций:</h3>
                <div className="emotion-list">
                  {Object.entries(dailyStats.emotion_distribution).map(([emotion, count]) => (
                    <div key={emotion} className="emotion-item">
                      <EmotionBadge emotion={emotion} />
                      <span className="emotion-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Пока нет записей за сегодня</p>
              <p className="hint">Начните вести дневник на странице "Дневник"</p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="health-card">
          <div className="health-header">
            <h2 className="card-title">Здоровье</h2>
          </div>
          {healthData.length > 0 ? (
            <div className="health-content">
              {healthData.map((data) => (
                <div key={data.id} className="health-item">
                  <div className="health-time">
                    {format(new Date(data.timestamp), 'HH:mm')}
                  </div>
                  <div className="health-metrics">
                    {data.heart_rate && (
                      <div className="metric">
                        <span className="metric-icon">❤️</span>
                        <span className="metric-value">{data.heart_rate}</span>
                        <span className="metric-unit">уд/мин</span>
                      </div>
                    )}
                    {data.steps && (
                      <div className="metric">
                        <span className="metric-icon">👣</span>
                        <span className="metric-value">{data.steps}</span>
                        <span className="metric-unit">шагов</span>
                      </div>
                    )}
                    {data.sleep_hours && (
                      <div className="metric">
                        <span className="metric-icon">😴</span>
                        <span className="metric-value">
                          {data.sleep_hours.toFixed(1)}
                        </span>
                        <span className="metric-unit">ч сна</span>
                      </div>
                    )}
                    {data.calories && (
                      <div className="metric">
                        <span className="metric-icon">🔥</span>
                        <span className="metric-value">{data.calories}</span>
                        <span className="metric-unit">ккал</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Нет данных о здоровье</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

export default HomePage

