import { useState, useEffect, useRef } from 'react'
import { diaryApi, DiaryEntry, emotionApi, EmotionLabel } from '../api/client'
import GlassCard from '../components/GlassCard'
import EmotionBadge from '../components/EmotionBadge'
import { format, startOfDay, endOfDay } from 'date-fns'
import './DiaryPage.css'

const EMOTIONS = ['радость', 'грусть', 'злость', 'страх', 'спокойствие', 'тревога']

function DiaryPage() {
  const [activeTab, setActiveTab] = useState<'diary' | 'mood'>('diary')
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(5)
  const [note, setNote] = useState('')
  const [moodLoading, setMoodLoading] = useState(false)
  const [todayLabels, setTodayLabels] = useState<EmotionLabel[]>([])

  useEffect(() => {
    loadEntries()
    loadTodayLabels()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [entries])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadEntries = async () => {
    try {
      const data = await diaryApi.getEntries()
      setEntries(data)
    } catch (error) {
      console.error('Ошибка загрузки записей:', error)
    }
  }

  const loadTodayLabels = async () => {
    try {
      const start = startOfDay(new Date()).toISOString()
      const end = endOfDay(new Date()).toISOString()
      const labels = await emotionApi.getEmotionLabels({
        start_date: start,
        end_date: end,
        limit: 50
      })
      setTodayLabels(labels)
    } catch (error) {
      console.error('Ошибка загрузки меток эмоций:', error)
    }
  }

  const handleDiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    setLoading(true)
    try {
      const newEntry = await diaryApi.createEntry(inputValue.trim())
      setEntries([newEntry, ...entries])
      setInputValue('')
    } catch (error: any) {
      console.error('Ошибка создания записи:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Неизвестная ошибка'
      alert(`Не удалось сохранить запись: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmotion || moodLoading) return

    setMoodLoading(true)
    try {
      await emotionApi.createEmotionLabel({
        emotion: selectedEmotion,
        intensity: intensity / 10,
        note: note.trim() || undefined
      })
      setSelectedEmotion(null)
      setIntensity(5)
      setNote('')
      await loadTodayLabels()
    } catch (error: any) {
      console.error('Ошибка сохранения эмоции:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Неизвестная ошибка'
      alert(`Не удалось сохранить эмоцию: ${errorMessage}`)
    } finally {
      setMoodLoading(false)
    }
  }

  const allEntries = [
    ...entries.map(entry => ({ type: 'diary' as const, data: entry, timestamp: entry.created_at })),
    ...todayLabels.map(label => ({ type: 'mood' as const, data: label, timestamp: label.timestamp }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="diary-page">
      <GlassCard className="diary-container">
        <div className="diary-header">
          <h2 className="page-title">Дневник</h2>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'diary' ? 'active' : ''}`}
              onClick={() => setActiveTab('diary')}
            >
              Запись
            </button>
            <button
              className={`tab ${activeTab === 'mood' ? 'active' : ''}`}
              onClick={() => setActiveTab('mood')}
            >
              Настроение
            </button>
          </div>
        </div>

        {activeTab === 'diary' && (
          <div className="diary-content">
            <form onSubmit={handleDiarySubmit} className="diary-input-form">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Напишите что-нибудь..."
                className="glass-input diary-textarea"
                rows={3}
                disabled={loading}
              />
              <button
                type="submit"
                className="glass-button primary submit-button"
                disabled={loading || !inputValue.trim()}
              >
                {loading ? 'Отправка...' : 'Сохранить'}
              </button>
            </form>

            <div className="entries-list">
              <h3 className="section-title">Все записи</h3>
              {allEntries.length === 0 ? (
                <div className="empty-state">
                  <p>Начните записывать свои мысли или отмечать настроение...</p>
                </div>
              ) : (
                <div className="entries-scroll">
                  {allEntries.map((item, index) => (
                    <div key={`${item.type}-${item.data.id}`} className="entry-item fade-in">
                      <div className="entry-header">
                        <span className="entry-time">
                          {format(new Date(item.timestamp), 'HH:mm')}
                        </span>
                        {item.type === 'diary' && (
                          <EmotionBadge emotion={item.data.emotion} intensity={item.data.intensity} />
                        )}
                        {item.type === 'mood' && (
                          <EmotionBadge emotion={item.data.emotion} intensity={item.data.intensity} />
                        )}
                        <span className="entry-type-badge">
                          {item.type === 'diary' ? '📝' : '😊'}
                        </span>
                      </div>
                      {item.type === 'diary' && (
                        <div className="entry-content">{item.data.content}</div>
                      )}
                      {item.type === 'mood' && item.data.note && (
                        <div className="entry-content">{item.data.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mood' && (
          <div className="mood-content">
            <form onSubmit={handleMoodSubmit} className="mood-form">
              <div className="emotion-selector">
                <label className="form-label">Выберите эмоцию:</label>
                <div className="emotion-grid">
                  {EMOTIONS.map((emotion) => (
                    <button
                      key={emotion}
                      type="button"
                      className={`emotion-button ${selectedEmotion === emotion ? 'selected' : ''}`}
                      onClick={() => setSelectedEmotion(emotion)}
                    >
                      <EmotionBadge emotion={emotion} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="intensity-selector">
                <label className="form-label">
                  Интенсивность: {intensity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="intensity-slider"
                />
                <div className="intensity-labels">
                  <span>Слабая</span>
                  <span>Сильная</span>
                </div>
              </div>

              <div className="note-input">
                <label className="form-label">Заметка (необязательно):</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Опишите, что происходит..."
                  className="glass-input note-textarea"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="glass-button primary submit-button"
                disabled={moodLoading || !selectedEmotion}
              >
                {moodLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>

            <div className="mood-history">
              <h3 className="section-title">Настроения за сегодня</h3>
              {todayLabels.length === 0 ? (
                <div className="empty-state">
                  <p>Пока нет записей настроения за сегодня</p>
                </div>
              ) : (
                <div className="mood-history-list">
                  {todayLabels.map((label) => (
                    <div key={label.id} className="mood-history-item fade-in">
                      <div className="mood-history-header">
                        <span className="mood-time">
                          {format(new Date(label.timestamp), 'HH:mm')}
                        </span>
                        <EmotionBadge emotion={label.emotion} intensity={label.intensity} />
                      </div>
                      {label.note && (
                        <div className="mood-note">{label.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

export default DiaryPage
