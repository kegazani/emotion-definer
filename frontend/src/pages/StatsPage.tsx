import { useState, useEffect } from 'react'
import { statsApi, DailyStats, WeeklyStats, MonthlyStats, watchApi, WatchAnalytics } from '../api/client'
import GlassCard from '../components/GlassCard'
import EmotionBadge from '../components/EmotionBadge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import './StatsPage.css'

const COLORS = ['#007AFF', '#34C759', '#FF2D55', '#AF52DE', '#FF9500', '#FFCC00']

function StatsPage() {
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [dailyWatchAnalytics, setDailyWatchAnalytics] = useState<WatchAnalytics | null>(null)
  const [weeklyWatchAnalytics, setWeeklyWatchAnalytics] = useState<WatchAnalytics | null>(null)
  const [monthlyWatchAnalytics, setMonthlyWatchAnalytics] = useState<WatchAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [activeTab])

  const loadStats = async () => {
    setLoading(true)
    try {
      if (activeTab === 'daily') {
        const [stats, watch] = await Promise.all([
          statsApi.getDailyStats(),
          watchApi.getWatchAnalytics({ period: 'day' })
        ])
        setDailyStats(stats)
        setDailyWatchAnalytics(watch)
      } else if (activeTab === 'weekly') {
        const [stats, watch] = await Promise.all([
          statsApi.getWeeklyStats(),
          watchApi.getWatchAnalytics({ period: 'week' })
        ])
        setWeeklyStats(stats)
        setWeeklyWatchAnalytics(watch)
      } else {
        const [stats, watch] = await Promise.all([
          statsApi.getMonthlyStats(),
          watchApi.getWatchAnalytics({ period: 'month' })
        ])
        setMonthlyStats(stats)
        setMonthlyWatchAnalytics(watch)
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  const prepareDailyChartData = () => {
    if (!dailyStats) return []
    return Object.entries(dailyStats.emotion_distribution).map(([emotion, count]) => ({
      emotion,
      count
    }))
  }

  const prepareWeeklyChartData = () => {
    if (!weeklyStats) return []
    return weeklyStats.daily_stats.map((stat, index) => ({
      day: format(new Date(stat.date), 'EEE'),
      date: stat.date,
      ...stat.emotion_distribution
    }))
  }

  const prepareMonthlyChartData = () => {
    if (!monthlyStats) return []
    return Object.entries(monthlyStats.emotion_patterns).map(([emotion, percentage]) => ({
      emotion,
      percentage: percentage * 100
    }))
  }

  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(timeStr), 'HH:mm')
    } catch {
      return timeStr
    }
  }

  const hrTrendData = dailyWatchAnalytics?.heart_rate_trend.map(item => ({
    ...item,
    time: formatTime(item.time)
  })) || []

  if (loading) {
    return (
      <div className="stats-page">
        <GlassCard>
          <p>Загрузка...</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="stats-page">
      <GlassCard>
        <div className="stats-header">
          <h2 className="page-title">Статистика</h2>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              День
            </button>
            <button
              className={`tab ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              Неделя
            </button>
            <button
              className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              Месяц
            </button>
          </div>
        </div>

        {activeTab === 'daily' && (
          <div className="stats-content">
            {dailyStats && (
              <div className="diary-stats-section">
                <h3 className="section-title">📝 Дневник</h3>
                <div className="stats-summary">
                  <div className="summary-item">
                    <span className="summary-label">Записей:</span>
                    <span className="summary-value">{dailyStats.total_entries}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Преобладающая эмоция:</span>
                    <EmotionBadge emotion={dailyStats.dominant_emotion} />
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Средняя интенсивность:</span>
                    <span className="summary-value">
                      {(dailyStats.avg_intensity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {prepareDailyChartData().length > 0 && (
                  <div className="chart-container">
                    <h4>Распределение эмоций</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={prepareDailyChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ emotion, count }) => `${emotion}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {prepareDailyChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {dailyWatchAnalytics && dailyWatchAnalytics.total_records > 0 && (
              <div className="watch-stats-section">
                <h3 className="section-title">⌚ Часы</h3>
                <div className="watch-summary-grid">
                  <div className="summary-card">
                    <span className="summary-icon">❤️</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {dailyWatchAnalytics.avg_heart_rate?.toFixed(0) || '—'}
                      </span>
                      <span className="summary-label">Пульс (сред.)</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">👣</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {dailyWatchAnalytics.total_steps.toLocaleString()}
                      </span>
                      <span className="summary-label">Шаги</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">🔥</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {dailyWatchAnalytics.total_calories.toLocaleString()}
                      </span>
                      <span className="summary-label">Ккал</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">🧠</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {dailyWatchAnalytics.avg_stress_level?.toFixed(0) || '—'}
                      </span>
                      <span className="summary-label">Стресс</span>
                    </div>
                  </div>
                </div>
                {hrTrendData.length > 0 && (
                  <div className="chart-container">
                    <h4>Пульс за день</h4>
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
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
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
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="stats-content">
            {weeklyStats && (
              <div className="diary-stats-section">
                <h3 className="section-title">📝 Дневник</h3>
                <div className="stats-summary">
                  <div className="summary-item">
                    <span className="summary-label">Период:</span>
                    <span className="summary-value">
                      {format(new Date(weeklyStats.week_start), 'd MMM')} -{' '}
                      {format(new Date(weeklyStats.week_end), 'd MMM')}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Всего записей:</span>
                    <span className="summary-value">{weeklyStats.total_entries}</span>
                  </div>
                </div>
                <div className="chart-container">
                  <h4>Тренд эмоций за неделю</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={prepareWeeklyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      {Object.keys(weeklyStats.emotion_trend).map((emotion, index) => (
                        <Line
                          key={emotion}
                          type="monotone"
                          dataKey={emotion}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {weeklyWatchAnalytics && weeklyWatchAnalytics.total_records > 0 && (
              <div className="watch-stats-section">
                <h3 className="section-title">⌚ Часы</h3>
                <div className="watch-summary-grid">
                  <div className="summary-card">
                    <span className="summary-icon">👣</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {weeklyWatchAnalytics.total_steps.toLocaleString()}
                      </span>
                      <span className="summary-label">Шаги</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">🔥</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {weeklyWatchAnalytics.total_calories.toLocaleString()}
                      </span>
                      <span className="summary-label">Ккал</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">❤️</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {weeklyWatchAnalytics.avg_heart_rate?.toFixed(0) || '—'}
                      </span>
                      <span className="summary-label">Пульс (сред.)</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">⏱️</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {weeklyWatchAnalytics.total_active_minutes}
                      </span>
                      <span className="summary-label">Активных мин</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="stats-content">
            {monthlyStats && (
              <div className="diary-stats-section">
                <h3 className="section-title">📝 Дневник</h3>
                <div className="stats-summary">
                  <div className="summary-item">
                    <span className="summary-label">Месяц:</span>
                    <span className="summary-value">
                      {format(new Date(monthlyStats.year, monthlyStats.month - 1, 1), 'MMMM yyyy')}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Всего записей:</span>
                    <span className="summary-value">{monthlyStats.total_entries}</span>
                  </div>
                </div>
                <div className="chart-container">
                  <h4>Паттерны эмоций за месяц</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareMonthlyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="emotion" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="percentage" fill="#007AFF">
                        {prepareMonthlyChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {monthlyWatchAnalytics && monthlyWatchAnalytics.total_records > 0 && (
              <div className="watch-stats-section">
                <h3 className="section-title">⌚ Часы</h3>
                <div className="watch-summary-grid">
                  <div className="summary-card">
                    <span className="summary-icon">👣</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {monthlyWatchAnalytics.total_steps.toLocaleString()}
                      </span>
                      <span className="summary-label">Шаги</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">🔥</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {monthlyWatchAnalytics.total_calories.toLocaleString()}
                      </span>
                      <span className="summary-label">Ккал</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">❤️</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {monthlyWatchAnalytics.avg_heart_rate?.toFixed(0) || '—'}
                      </span>
                      <span className="summary-label">Пульс (сред.)</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon">😴</span>
                    <div className="summary-content">
                      <span className="summary-value">
                        {monthlyWatchAnalytics.avg_sleep_hours?.toFixed(1) || '—'}
                      </span>
                      <span className="summary-label">Сон (ч/день)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

export default StatsPage
