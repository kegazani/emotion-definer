import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DiaryPage from './pages/DiaryPage'
import StatsPage from './pages/StatsPage'
import RealtimePage from './pages/RealtimePage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/diary" replace />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/realtime" element={<RealtimePage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

