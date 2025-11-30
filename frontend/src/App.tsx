import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AlertProvider } from './contexts/AlertContext'
import { AuthProvider, useAuth } from './services/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { QueriesPage } from './pages/QueriesPage'
import { AlertSystem } from './components/AlertSystem'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Main App Routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/query-history"
        element={
          <ProtectedRoute>
            <QueriesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
            <AlertSystem />
          </Router>
        </AuthProvider>
      </AlertProvider>
    </ThemeProvider>
  )
}

export default App
