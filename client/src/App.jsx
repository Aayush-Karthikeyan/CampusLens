import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import ErrorBoundary from './components/ErrorBoundary'
import AuthProvider from './components/AuthProvider'
import RequireAuth from './components/RequireAuth'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Legal = lazy(() => import('./pages/Legal'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CourseWorkspace = lazy(() => import('./pages/CourseWorkspace'))
const Chat = lazy(() => import('./pages/Chat'))
const Quiz = lazy(() => import('./pages/Quiz'))
const StudyPlan = lazy(() => import('./pages/StudyPlan'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-dvh bg-night text-cream" />}>
          <Routes>
            {/* public: the landing page is the pitch, so it must not need a login */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/terms" element={<Legal kind="terms" />} />

            {/* everything below owns user data and requires a session */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            {/* shared rail layout — chat/quiz/study-plan render inside it and keep the selected course */}
            <Route
              element={
                <RequireAuth>
                  <CourseWorkspace />
                </RequireAuth>
              }
            >
              <Route path="/chat" element={<Chat />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/study-plan" element={<StudyPlan />} />
            </Route>
          </Routes>
        </Suspense>
        {/* anonymous page-view counts; no cookies, inert outside Vercel */}
        <Analytics />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
