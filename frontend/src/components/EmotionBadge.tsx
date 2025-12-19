import './EmotionBadge.css'

interface EmotionBadgeProps {
  emotion: string
  intensity?: number
}

function EmotionBadge({ emotion, intensity }: EmotionBadgeProps) {
  const intensityBars = intensity ? Math.round(intensity * 5) : 0
  
  return (
    <div className="emotion-badge-container">
      <span className={`emotion-badge emotion-${emotion}`}>
        {emotion}
      </span>
      {intensity !== undefined && (
        <div className="intensity-indicator">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`intensity-bar ${i < intensityBars ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default EmotionBadge

