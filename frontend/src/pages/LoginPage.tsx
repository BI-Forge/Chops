import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { authAPI } from '../services/api'
import { HighPerformanceFeatureIcon, EnterpriseSecurityFeatureIcon, MonitoringFeatureIcon } from '../components/Icons'
import { ClickhouseOpsLogo } from '../components/ClickhouseOpsLogo'
import '../styles/LoginPage.css'

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Don't block rendering - show page immediately
  // Redirect to dashboard in background if authenticated
  if (!authLoading && isAuthenticated) {
    navigate('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (activeTab === 'login') {
        const loginUsername = username || email
        if (!loginUsername || !password) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }
        await login(loginUsername, password)
        navigate('/dashboard')
      } else {
        if (!username || !email || !password) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters')
          setLoading(false)
          return
        }
        await authAPI.register({ username, email, password })
        await login(username, password)
        navigate('/dashboard')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setError('')
    setEmail('')
    setUsername('')
    setPassword('')
    setRememberMe(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__left-content">
          <div className="auth-page__logo">
            <ClickhouseOpsLogo size="medium" variant="light" iconOnly={false} />
          </div>

          <div className="auth-page__hero">
            <h2>Modern Database</h2>
            <h2>Management Platform</h2>
            <p>Powerful tools for managing your ClickHouse clusters with real-time analytics and monitoring.</p>
          </div>

          <div className="auth-page__features">
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--orange">
                <HighPerformanceFeatureIcon />
              </div>
              <div>
                <h3>High Performance</h3>
                <p>Lightning-fast OLAP queries for real-time analytics</p>
              </div>
            </div>
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--blue">
                <EnterpriseSecurityFeatureIcon />
              </div>
              <div>
                <h3>Enterprise Security</h3>
                <p>Role-based access control and encryption at rest</p>
              </div>
            </div>
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--purple">
                <MonitoringFeatureIcon />
              </div>
              <div>
                <h3>Real-time Monitoring</h3>
                <p>Track cluster health and performance metrics</p>
              </div>
            </div>
          </div>

          <div className="auth-page__footer">
            <p>© 2025 ClickHouse Operations. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-card">
          <div className="auth-card__tabs">
            <button
              type="button"
              className={`auth-card__tab ${activeTab === 'login' ? 'auth-card__tab--active' : ''}`}
              onClick={() => handleTabChange('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-card__tab ${activeTab === 'register' ? 'auth-card__tab--active' : ''}`}
              onClick={() => handleTabChange('register')}
            >
              Register
            </button>
          </div>

          <div className="auth-card__content">
            <div className="auth-card__header">
              <h2>{activeTab === 'login' ? 'Welcome back' : 'Create an account'}</h2>
              <p>{activeTab === 'login' ? 'Sign in to your account to continue' : 'Sign up to get started'}</p>
            </div>

            {error && (
              <div className="auth-card__error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-card__form">
              {activeTab === 'register' && (
                <div className="auth-card__field">
                  <label htmlFor="username">Username</label>
                  <div className="auth-card__input-wrapper">
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'register' && (
                <div className="auth-card__field">
                  <label htmlFor="email">Email</label>
                  <div className="auth-card__input-wrapper">
                    <input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'login' && (
                <div className="auth-card__field">
                  <label htmlFor="username">Username or Email</label>
                  <div className="auth-card__input-wrapper">
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username or email"
                      value={username || email}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.includes('@')) {
                          setEmail(value)
                          setUsername('')
                        } else {
                          setUsername(value)
                          setEmail('')
                        }
                      }}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-card__field">
                <label htmlFor="password">Password</label>
                <div className="auth-card__input-wrapper">
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={activeTab === 'register' ? 8 : undefined}
                  />
                </div>
              </div>

              <div className="auth-card__options">
                <label className="auth-card__checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                {activeTab === 'login' && (
                  <button type="button" className="auth-card__forgot">
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="auth-card__submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : activeTab === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

