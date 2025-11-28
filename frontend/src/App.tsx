import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import QueryHistoryPage from './pages/QueryHistoryPage'
import { AuthProvider } from './services/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import { BackgroundPattern } from './components/BackgroundPattern'
import './styles/App.css'

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <BackgroundPattern />
        <div className="app-content">
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/query-history"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <QueryHistoryPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </AuthProvider>
  )
}

export default App

