import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AlertProvider, useAlert } from './contexts/AlertContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { AuthProvider, useAuth } from './services/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { QueriesPage } from './pages/QueriesPage'
import { BackupsPage } from './pages/BackupsPage'
import { UsersPage } from './pages/UsersPage'
import { TablesPage } from './pages/TablesPage'
import { SettingsPage } from './pages/SettingsPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import { AlertSystem } from './components/AlertSystem'
import { beginPageScope } from './utils/pageScope'

// Drop in-flight HTTP from the previous route so the next page starts clean.
function PageScope() {
  const location = useLocation()
  const { clearAlerts } = useAlert()

  useEffect(() => {
    clearAlerts()
    return () => {
      beginPageScope()
    }
  }, [location.pathname, clearAlerts])

  return null
}

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
      <Route
        path="/backups"
        element={
          <ProtectedRoute>
            <BackupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute>
            <TablesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-settings"
        element={
          <ProtectedRoute>
            <AdminSettingsPage />
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
        <SidebarProvider>
          <AuthProvider>
            <Router>
              <PageScope />
              <AppRoutes />
              <AlertSystem />
            </Router>
          </AuthProvider>
        </SidebarProvider>
      </AlertProvider>
    </ThemeProvider>
  )
}

export default App
