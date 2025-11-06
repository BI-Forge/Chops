import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { ProfileIcon, SettingsIcon, LightModeIcon, LogoutIcon } from './Icons'
import './ProfileContextMenu.css'

interface ProfileContextMenuProps {
  isOpen: boolean
  onClose: () => void
  anchorElement: HTMLElement | null
}

const ProfileContextMenu = ({ isOpen, onClose, anchorElement }: ProfileContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          anchorElement && !anchorElement.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, anchorElement])

  useEffect(() => {
    if (!isOpen || !anchorElement || !menuRef.current) return

    const anchorRect = anchorElement.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = anchorRect.bottom + 8
    let left = anchorRect.left

    // Adjust if menu goes off screen
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 16
    }
    if (top + menuRect.height > viewportHeight) {
      top = anchorRect.top - menuRect.height - 8
    }
    if (left < 16) {
      left = 16
    }

    menuRef.current.style.top = `${top}px`
    menuRef.current.style.left = `${left}px`
  }, [isOpen, anchorElement])

  if (!isOpen) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose()
  }

  return (
    <div ref={menuRef} className="profile-context-menu">
      <div className="profile-context-menu__header">
        <div className="profile-context-menu__user-info">
          <p className="profile-context-menu__username">{user?.username || 'User'}</p>
          <p className="profile-context-menu__email">{user?.email || `${user?.username || 'user'}@clickhouse.local`}</p>
        </div>
      </div>
      <div className="profile-context-menu__divider"></div>
      <div className="profile-context-menu__items">
        <button className="profile-context-menu__item">
          <ProfileIcon />
          <span>Profile</span>
        </button>
        <button className="profile-context-menu__item">
          <SettingsIcon />
          <span>Settings</span>
        </button>
        <button className="profile-context-menu__item">
          <LightModeIcon />
          <span>Light Mode</span>
        </button>
      </div>
      <div className="profile-context-menu__divider"></div>
      <div className="profile-context-menu__items">
        <button className="profile-context-menu__item profile-context-menu__item--danger" onClick={handleLogout}>
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default ProfileContextMenu

