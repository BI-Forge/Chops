import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../services/AuthContext'
import { authAPI } from '../services/api'
import './LoginPage.css'

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
    <motion.div
      className="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="auth-page__left"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="auth-page__left-content">
          <div className="auth-page__logo">
            <div className="auth-page__logo-icon"></div>
            <div className="auth-page__logo-text">
              <h1>ClickHouse</h1>
              <p>Operations Panel</p>
            </div>
          </div>

          <div className="auth-page__hero">
            <h2>Modern Database</h2>
            <h2>Management Platform</h2>
            <p>Powerful tools for managing your ClickHouse clusters with real-time analytics and monitoring.</p>
          </div>

          <div className="auth-page__features">
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--orange"></div>
              <div>
                <h3>High Performance</h3>
                <p>Lightning-fast OLAP queries for real-time analytics</p>
              </div>
            </div>
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--blue"></div>
              <div>
                <h3>Enterprise Security</h3>
                <p>Role-based access control and encryption at rest</p>
              </div>
            </div>
            <div className="auth-page__feature">
              <div className="auth-page__feature-icon auth-page__feature-icon--purple"></div>
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
      </motion.div>

      <motion.div
        className="auth-page__right"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      >
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="auth-card__tabs">
            <motion.button
              type="button"
              className={`auth-card__tab ${activeTab === 'login' ? 'auth-card__tab--active' : ''}`}
              onClick={() => handleTabChange('login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>
            <motion.button
              type="button"
              className={`auth-card__tab ${activeTab === 'register' ? 'auth-card__tab--active' : ''}`}
              onClick={() => handleTabChange('register')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Register
            </motion.button>
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

            <motion.form
              onSubmit={handleSubmit}
              className="auth-card__form"
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'register' && (
                <motion.div
                  className="auth-card__field"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>
              )}

              {activeTab === 'register' && (
                <motion.div
                  className="auth-card__field"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
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
                </motion.div>
              )}

              {activeTab === 'login' && (
                <motion.div
                  className="auth-card__field"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>
              )}

              <motion.div
                className="auth-card__field"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: activeTab === 'register' ? 0.2 : 0.15 }}
              >
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
              </motion.div>

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

              <motion.button
                type="submit"
                className="auth-card__submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Signing in...' : activeTab === 'login' ? 'Sign in' : 'Sign up'}
              </motion.button>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default LoginPage

