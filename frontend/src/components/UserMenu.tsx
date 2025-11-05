import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../services/AuthContext'
import { UserIcon, SettingsIcon, SunIcon, LogoutIcon } from './Icons'
import './UserMenu.css'

interface UserMenuProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement>
}

const UserMenu: React.FC<UserMenuProps> = ({ isOpen, onClose, anchorRef }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose, anchorRef])

  const handleMenuItemClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          className="user-menu"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
        >
          <div className="user-menu__header">
            <span className="user-menu__title">My Account</span>
          </div>
          <div className="user-menu__divider" />
          <div className="user-menu__items">
            <motion.button
              className="user-menu__item"
              onClick={() => handleMenuItemClick(() => {})}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="user-menu__item-icon">
                <UserIcon size={16} />
              </span>
              <span className="user-menu__item-label">Profile</span>
            </motion.button>
            <motion.button
              className="user-menu__item"
              onClick={() => handleMenuItemClick(() => {})}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="user-menu__item-icon">
                <SettingsIcon size={16} />
              </span>
              <span className="user-menu__item-label">Settings</span>
            </motion.button>
            <motion.button
              className="user-menu__item"
              onClick={() => handleMenuItemClick(() => {})}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="user-menu__item-icon">
                <SunIcon size={16} />
              </span>
              <span className="user-menu__item-label">Light Mode</span>
            </motion.button>
          </div>
          <div className="user-menu__divider" />
          <motion.button
            className="user-menu__item user-menu__item--logout"
            onClick={() => handleMenuItemClick(logout)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className="user-menu__item-icon">
              <LogoutIcon size={16} />
            </span>
            <span className="user-menu__item-label">Logout</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UserMenu

