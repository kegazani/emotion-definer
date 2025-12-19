import { useState, useEffect } from 'react'
import { watchApi, WatchData, WatchAnalytics } from '../api/client'
import GlassCard from '../components/GlassCard'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import './WatchPage.css'

function WatchPage() {
  const [analytics, setAnalytics] = useState<WatchAnalytics | null>(null)
  const [latestData, setLatestData] = useState<WatchData | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      const [analyticsData, latest] = await Promise.all([
        watchApi.getWatchAnalytics({ period }),
        watchApi.getLatestWatchData()
      ])
      setAnalytics(analyticsData)
      setLatestData(latest)
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

  const hrTrendData = analytics?.heart_rate_trend.map(item => ({
    ...item,
    time: formatTime(item.time)
  })) || []

  const stressTrendData = analytics?.stress_trend.map(item => ({
    ...item,
    time: formatTime(item.time)
  })) || []

  const activityTrendData = analytics?.activity_trend.map(item => ({
    ...item,
    time: formatTime(item.time)
  })) || []

  if (loading && !analytics) {
    return (
      <div className="watch-page">
        <GlassCard>
          <p>Загрузка данных с часов...</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="watch-page">
      <div className="watch-header">
        <h1 className="page-title">⌚ Данные с часов</h1>
        <div className="header-actions">
          <div className="tabs">
            <button
              className={`tab ${period === 'day' ? 'active' : ''}`}
              onClick={() => setPeriod('day')}
            >
              День
            </button>
            <button
              className={`tab ${period === 'week' ? 'active' : ''}`}
              onClick={() => setPeriod('week')}
            >
              Неделя
            </button>
            <button
              className={`tab ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>

      {latestData && (
        <GlassCard className="realtime-card">
          <h2 className="section-title">Текущие показатели</h2>
          <div className="realtime-grid">
            {latestData.heart_rate && (
              <div className="metric-card heart">
                <div className="metric-icon">❤️</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.heart_rate}</span>
                  <span className="metric-unit">уд/мин</span>
                </div>
              </div>
            )}
            {latestData.spo2 && (
              <div className="metric-card oxygen">
                <div className="metric-icon">🫁</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.spo2}%</span>
                  <span className="metric-unit">SpO2</span>
                </div>
              </div>
            )}
            {latestData.stress_level && (
              <div className="metric-card stress">
                <div className="metric-icon">🧠</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.stress_level}</span>
                  <span className="metric-unit">стресс</span>
                </div>
              </div>
            )}
            {latestData.body_battery && (
              <div className="metric-card battery">
                <div className="metric-icon">⚡</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.body_battery}%</span>
                  <span className="metric-unit">энергия</span>
                </div>
              </div>
            )}
            {latestData.hrv && (
              <div className="metric-card hrv">
                <div className="metric-icon">📊</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.hrv.toFixed(0)}</span>
                  <span className="metric-unit">HRV мс</span>
                </div>
              </div>
            )}
            {latestData.skin_temperature && (
              <div className="metric-card temp">
                <div className="metric-icon">🌡️</div>
                <div className="metric-info">
                  <span className="metric-value">{latestData.skin_temperature.toFixed(1)}°</span>
                  <span className="metric-unit">темп.</span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {analytics && analytics.total_records > 0 && (
        <>
          <div className="stats-grid">
            <GlassCard className="stat-card">
              <div className="stat-icon">👣</div>
              <div className="stat-content">
                <span className="stat-value">{analytics.total_steps.toLocaleString()}</span>
                <span className="stat-label">шагов</span>
              </div>
            </GlassCard>
            <GlassCard className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <span className="stat-value">{analytics.total_calories.toLocaleString()}</span>
                <span className="stat-label">ккал</span>
              </div>
            </GlassCard>
            <GlassCard className="stat-card">
              <div className="stat-icon">🏃</div>
              <div className="stat-content">
                <span className="stat-value">{analytics.total_distance.toFixed(1)}</span>
                <span className="stat-label">км</span>
              </div>
            </GlassCard>
            <GlassCard className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <span className="stat-value">{analytics.total_active_minutes}</span>
                <span className="stat-label">активных мин</span>
              </div>
            </GlassCard>
          </div>

          <div className="charts-grid">
            <GlassCard className="chart-card">
              <h3 className="chart-title">Пульс</h3>
              <div className="hr-summary">
                <div className="hr-stat">
                  <span className="hr-label">Средний</span>
                  <span className="hr-value">{analytics.avg_heart_rate?.toFixed(0) || '—'}</span>
                </div>
                <div className="hr-stat">
                  <span className="hr-label">Мин</span>
                  <span className="hr-value min">{analytics.min_heart_rate || '—'}</span>
                </div>
                <div className="hr-stat">
                  <span className="hr-label">Макс</span>
                  <span className="hr-value max">{analytics.max_heart_rate || '—'}</span>
                </div>
              </div>
              {hrTrendData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={hrTrendData}>
                    <defs>
                      <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#FF2D55" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#FF2D55" fill="url(#hrGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </GlassCard>

            <GlassCard className="chart-card">
              <h3 className="chart-title">Уровень стресса</h3>
              <div className="stress-summary">
                <span className="stress-avg">Средний: {analytics.avg_stress_level?.toFixed(0) || '—'}</span>
              </div>
              {stressTrendData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stressTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#AF52DE" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </div>

          <GlassCard className="activity-chart">
            <h3 className="chart-title">Активность</h3>
            {activityTrendData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="steps" fill="#34C759" name="Шаги" />
                  <Bar yAxisId="right" dataKey="calories" fill="#FF9500" name="Калории" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {(analytics.avg_sleep_hours || analytics.avg_hrv || analytics.avg_spo2) && (
            <GlassCard className="health-summary">
              <h3 className="chart-title">Здоровье</h3>
              <div className="health-grid">
                {analytics.avg_sleep_hours && (
                  <div className="health-item">
                    <span className="health-icon">😴</span>
                    <span className="health-value">{analytics.avg_sleep_hours.toFixed(1)}ч</span>
                    <span className="health-label">сон</span>
                  </div>
                )}
                {analytics.avg_hrv && (
                  <div className="health-item">
                    <span className="health-icon">💓</span>
                    <span className="health-value">{analytics.avg_hrv.toFixed(0)}мс</span>
                    <span className="health-label">HRV</span>
                  </div>
                )}
                {analytics.avg_spo2 && (
                  <div className="health-item">
                    <span className="health-icon">🫁</span>
                    <span className="health-value">{analytics.avg_spo2.toFixed(0)}%</span>
                    <span className="health-label">SpO2</span>
                  </div>
                )}
                {analytics.avg_body_battery && (
                  <div className="health-item">
                    <span className="health-icon">🔋</span>
                    <span className="health-value">{analytics.avg_body_battery.toFixed(0)}%</span>
                    <span className="health-label">энергия</span>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {(!analytics || analytics.total_records === 0) && !loading && (
        <GlassCard className="empty-state-card">
          <div className="empty-icon">⌚</div>
          <h3>Нет данных с часов</h3>
          <p>Данные появятся здесь, когда часы начнут отправлять информацию</p>
        </GlassCard>
      )}
    </div>
  )
}

export default WatchPage

