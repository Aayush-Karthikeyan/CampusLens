import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Chat = lazy(() => import('./pages/Chat'))
const Quiz = lazy(() => import('./pages/Quiz'))
const StudyPlan = lazy(() => import('./pages/StudyPlan'))

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-night text-cream" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/study-plan" element={<StudyPlan />} />
      </Routes>
    </Suspense>
  )
}

export default App
