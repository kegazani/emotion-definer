import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="layout">
      <nav className="glass nav">
        <div className="nav-brand">
          <span className="nav-icon">📔</span>
          <span className="nav-title">Emotion Diary</span>
        </div>
        <div className="nav-links">
          <Link
            to="/diary"
            className={`nav-link ${location.pathname === '/diary' ? 'active' : ''}`}
          >
            Дневник
          </Link>
          <Link
            to="/stats"
            className={`nav-link ${location.pathname === '/stats' ? 'active' : ''}`}
          >
            Статистика
          </Link>
          <Link
            to="/realtime"
            className={`nav-link ${location.pathname === '/realtime' ? 'active' : ''}`}
          >
            Состояние
          </Link>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout

