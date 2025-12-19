import './GlassCard.css'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

function GlassCard({ children, className = '', onClick }: GlassCardProps) {
  return (
    <div className={`glass glass-card ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export default GlassCard

