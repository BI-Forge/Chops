import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../services/AuthContext'
import {
  DashboardIcon,
  QueryConsoleIcon,
  QueryHistoryIcon,
  TablesIcon,
  BackupsIcon,
  ClusterMonitorIcon,
  ConfigurationIcon,
} from './Icons'
import UserMenu from './UserMenu'
import './Sidebar.css'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/query-console', label: 'Query Console', icon: QueryConsoleIcon },
  { path: '/query-history', label: 'Query History', icon: QueryHistoryIcon },
  { path: '/tables', label: 'Tables', icon: TablesIcon },
  { path: '/backups', label: 'Backups', icon: BackupsIcon },
  { path: '/cluster-monitor', label: 'Cluster Monitor', icon: ClusterMonitorIcon },
  { path: '/configuration', label: 'Configuration', icon: ConfigurationIcon },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNavClick = (path: string) => {
    navigate(path)
    if (onClose) {
      onClose()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <motion.aside
      className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
      initial={{ x: isMobile ? -256 : 0 }}
      animate={{ x: isMobile ? (isOpen ? 0 : -256) : 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="sidebar__overlay" />
      <div className="sidebar__content">
        {/* Logo */}
        <motion.div
          className="sidebar__logo"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="sidebar__logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="url(#gradient1)"
                stroke="url(#gradient1)"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="url(#gradient1)"
                strokeWidth="2"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="url(#gradient1)"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0b100" />
                  <stop offset="100%" stopColor="#f54900" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="sidebar__logo-text">
            <h1 className="sidebar__logo-title">ClickHouse</h1>
            <p className="sidebar__logo-subtitle">Operations Panel</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path
            return (
              <motion.button
                key={item.path}
                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ 
                  scale: 1.02, 
                  x: 4,
                  transition: { type: 'spring', stiffness: 400, damping: 25 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    className="sidebar__nav-item-bg"
                    layoutId="activeNavItem"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="sidebar__nav-icon">
                  <item.icon size={20} />
                </span>
                <span className="sidebar__nav-label">{item.label}</span>
              </motion.button>
            )
          })}
        </nav>

        {/* Storage Indicator */}
        <motion.div
          className="sidebar__storage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="sidebar__storage-header">
            <span className="sidebar__storage-label">Storage Used</span>
            <span className="sidebar__storage-value">73%</span>
          </div>
          <div className="sidebar__storage-bar">
            <motion.div
              className="sidebar__storage-progress"
              initial={{ width: 0 }}
              animate={{ width: '73%' }}
              transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* User Profile */}
        <div className="sidebar__user-wrapper">
          <motion.button
            ref={userButtonRef}
            className="sidebar__user"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            whileHover={{ 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="sidebar__user-avatar">
              <span className="sidebar__user-initials">
                {user ? getInitials(user.username) : 'JD'}
              </span>
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.username || 'John Doe'}</span>
              <span className="sidebar__user-role">Admin</span>
            </div>
          </motion.button>
          <UserMenu
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            anchorRef={userButtonRef}
          />
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar

