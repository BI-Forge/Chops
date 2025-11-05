import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'

const DashboardPage = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div style={{ padding: '48px', color: '#ffffff' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

export default DashboardPage

