import React from 'react'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import {
  ServerIcon,
  ChevronDownIcon,
  ChartIcon,
  LightningIcon,
  StorageIcon,
  ConnectionIcon,
} from '../components/Icons'
import './DashboardPage.css'

const DashboardPage: React.FC = () => {
  return (
    <Layout>
      <motion.div
        className="dashboard-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="dashboard-page__header">
          <div className="dashboard-page__header-content">
            <motion.h1
              className="dashboard-page__title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Dashboard
            </motion.h1>
            <motion.p
              className="dashboard-page__subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              Monitor your ClickHouse cluster performance
            </motion.p>
          </div>
          <motion.button
            className="dashboard-page__node-selector"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ 
              scale: 1.05,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="dashboard-page__node-selector-icon">
              <ServerIcon size={16} />
            </span>
            <span className="dashboard-page__node-selector-text">node-03</span>
            <span className="dashboard-page__node-selector-arrow">
              <ChevronDownIcon size={12} />
            </span>
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-page__stats">
          {[
            {
              icon: ChartIcon,
              value: '45.2K',
              label: 'Total Queries',
              change: '+12.5%',
              changePositive: true,
              gradient: 'linear-gradient(135deg, #2b7fff 0%, #00b8db 100%)',
            },
            {
              icon: LightningIcon,
              value: '23ms',
              label: 'Avg Response Time',
              change: '-8.2%',
              changePositive: false,
              gradient: 'linear-gradient(135deg, #f0b100 0%, #ff6900 100%)',
            },
            {
              icon: StorageIcon,
              value: '381 GB',
              label: 'Storage Used',
              change: '+5.1%',
              changePositive: true,
              gradient: 'linear-gradient(135deg, #ad46ff 0%, #f6339a 100%)',
            },
            {
              icon: ConnectionIcon,
              value: '1,243',
              label: 'Active Connections',
              change: '+18.3%',
              changePositive: true,
              gradient: 'linear-gradient(135deg, #00c950 0%, #00bc7d 100%)',
            },
          ].map((stat, index) => {
            const IconComponent = stat.icon
            return (
            <motion.div
              key={index}
              className="dashboard-page__stat-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, ease: 'easeOut' }}
              whileHover={{ 
                scale: 1.02, 
                y: -4,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
            >
              <div className="dashboard-page__stat-header">
                <div
                  className="dashboard-page__stat-icon"
                  style={{ background: stat.gradient }}
                >
                  <IconComponent size={24} />
                </div>
                <div className="dashboard-page__stat-change">
                  <span
                    className={`dashboard-page__stat-change-value ${
                      stat.changePositive ? 'positive' : 'negative'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="dashboard-page__stat-value">{stat.value}</div>
              <div className="dashboard-page__stat-label">{stat.label}</div>
            </motion.div>
            )
          })}
        </div>

        {/* Placeholder Content */}
        <motion.div
          className="dashboard-page__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="dashboard-page__placeholder">
            <motion.div
              className="dashboard-page__placeholder-icon"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <ChartIcon size={64} />
            </motion.div>
            <h2 className="dashboard-page__placeholder-title">Dashboard Content</h2>
            <p className="dashboard-page__placeholder-text">
              Charts and detailed metrics will be displayed here
            </p>
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  )
}

export default DashboardPage
