import { useState, useEffect } from 'react'
import { emotionApi, EmotionLabel, EmotionPrediction } from '../api/client'
import GlassCard from '../components/GlassCard'
import EmotionBadge from '../components/EmotionBadge'
import { format, startOfDay, endOfDay } from 'date-fns'
import './MoodPage.css'

const EMOTIONS = ['радость', 'грусть', 'злость', 'страх', 'спокойствие', 'тревога']

function MoodPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(5)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [todayLabels, setTodayLabels] = useState<EmotionLabel[]>([])
  const [prediction, setPrediction] = useState<EmotionPrediction | null>(null)
  const [showPrediction, setShowPrediction] = useState(false)

  useEffect(() => {
    loadTodayLabels()
    loadPrediction()
  }, [])

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

  const loadPrediction = async () => {
    try {
      const pred = await emotionApi.predictEmotion()
      setPrediction(pred)
    } catch (error) {
      console.error('Ошибка загрузки предсказания:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmotion || loading) return

    setLoading(true)
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
      await loadPrediction()
    } catch (error: any) {
      console.error('Ошибка сохранения эмоции:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Неизвестная ошибка'
      alert(`Не удалось сохранить эмоцию: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mood-page">
      <div className="mood-grid">
        <GlassCard className="mood-input-card">
          <h2 className="page-title">Как вы себя чувствуете?</h2>
          
          {showPrediction && prediction && (
            <div className="prediction-section">
              <h3>Предсказание на основе биометрии:</h3>
              <div className="prediction-result">
                <EmotionBadge emotion={prediction.emotion} intensity={prediction.confidence} />
                <span className="prediction-confidence">
                  {(prediction.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mood-form">
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
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="glass-button primary submit-button"
              disabled={loading || !selectedEmotion}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>

          <button
            type="button"
            className="glass-button secondary prediction-toggle"
            onClick={() => setShowPrediction(!showPrediction)}
          >
            {showPrediction ? 'Скрыть предсказание' : 'Показать предсказание'}
          </button>
        </GlassCard>

        <GlassCard className="mood-history-card">
          <h2 className="page-title">История за сегодня</h2>
          {todayLabels.length === 0 ? (
            <div className="empty-state">
              <p>Пока нет записей настроения за сегодня</p>
              <p className="hint">Отметьте свое настроение выше</p>
            </div>
          ) : (
            <div className="mood-history">
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
        </GlassCard>
      </div>
    </div>
  )
}

export default MoodPage

