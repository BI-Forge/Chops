import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import {
  DashboardIcon,
  QueryConsoleIcon,
  QueryHistoryIcon,
  TablesIcon,
  BackupsIcon,
  ClusterMonitorIcon,
  ConfigurationIcon,
  ChevronDownIcon,
  LogoIcon,
} from './Icons'
import ProfileContextMenu from './ProfileContextMenu'
import './Sidebar.css'

interface SidebarProps {
  isMobile?: boolean
  onMobileClose?: () => void
}

const Sidebar = ({ isMobile = false, onMobileClose }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/query-console', label: 'Query Console', icon: QueryConsoleIcon },
    { path: '/query-history', label: 'Query History', icon: QueryHistoryIcon },
    { path: '/tables', label: 'Tables', icon: TablesIcon },
    { path: '/backups', label: 'Backups', icon: BackupsIcon },
    { path: '/cluster-monitor', label: 'Cluster Monitor', icon: ClusterMonitorIcon },
    { path: '/configuration', label: 'Configuration', icon: ConfigurationIcon },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  const getInitials = (username?: string) => {
    if (!username) return 'U'
    return username
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside className={`sidebar ${isMobile ? 'sidebar--mobile' : ''}`}>
      <div className="sidebar__container">
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <LogoIcon />
          </div>
          <div className="sidebar__logo-text">
            <h1>ClickHouse</h1>
            <p>Operations Panel</p>
          </div>
        </div>

        <nav className="sidebar__navigation">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            return (
              <button
                key={item.path}
                className={`sidebar__nav-item ${
                  location.pathname === item.path ? 'sidebar__nav-item--active' : ''
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="sidebar__nav-icon">
                  <IconComponent />
                </span>
                <span className="sidebar__nav-label">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar__profile">
          <button
            ref={profileButtonRef}
            className="sidebar__profile-button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="sidebar__profile-avatar">
              <span>{getInitials(user?.username)}</span>
            </div>
            <div className="sidebar__profile-info">
              <p className="sidebar__profile-name">{user?.username || 'User'}</p>
              <p className="sidebar__profile-role">Admin</p>
            </div>
            <span className="sidebar__profile-arrow">
              <ChevronDownIcon />
            </span>
          </button>
          <ProfileContextMenu
            isOpen={isProfileMenuOpen}
            onClose={() => setIsProfileMenuOpen(false)}
            anchorElement={profileButtonRef.current}
          />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

