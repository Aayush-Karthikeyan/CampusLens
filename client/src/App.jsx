import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AuthProvider from './components/AuthProvider'
import RequireAuth from './components/RequireAuth'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
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
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
