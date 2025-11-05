import React from 'react'
import { motion } from 'framer-motion'
import { MenuIcon } from './Icons'
import './MobileHeader.css'

interface MobileHeaderProps {
  onMenuClick: () => void
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
  return (
    <motion.header
      className="mobile-header"
      initial={{ y: -77, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="mobile-header__content">
        <div className="mobile-header__logo">
          <div className="mobile-header__logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="url(#mobileGradient1)"
                stroke="url(#mobileGradient1)"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="url(#mobileGradient1)"
                strokeWidth="2"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="url(#mobileGradient1)"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="mobileGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0b100" />
                  <stop offset="100%" stopColor="#f54900" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="mobile-header__logo-text">
            <h1 className="mobile-header__logo-title">ClickHouse</h1>
            <p className="mobile-header__logo-subtitle">Operations Panel</p>
          </div>
        </div>
        <motion.button
          className="mobile-header__menu-button"
          onClick={onMenuClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          aria-label="Toggle menu"
        >
          <MenuIcon size={16} />
        </motion.button>
      </div>
    </motion.header>
  )
}

export default MobileHeader

