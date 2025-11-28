import DashboardGrayIcon from '../icons/dashboard_gray.svg?react'
import QueryHistoryWhiteIcon from '../icons/query_history_white.svg?react'
import TableWhiteIcon from '../icons/table_white.svg?react'
import BackupGrayIcon from '../icons/backup_gray.svg?react'
import ConfigGrayIcon from '../icons/config_gray.svg?react'
import DbGrayIcon from '../icons/db_gray.svg?react'
import ProfileGrayIcon from '../icons/profile_gray.svg?react'
import ExitGrayIcon from '../icons/exit_gray.svg?react'
import SunYellowIcon from '../icons/sun_yelow.svg?react'
import MenuWhiteIcon from '../icons/menu_white.svg?react'

import CpuWhiteIcon from '../icons/cpu_white.svg?react'
import MemWhiteIcon from '../icons/mem_white.svg?react'
import DiskWhiteIcon from '../icons/disk_white.svg?react'
import DbWhiteIcon from '../icons/db_white.svg?react'
import FlashWhiteIcon from '../icons/flash_white.svg?react'
import NodeWhiteIcon from '../icons/node_white.svg?react'
import CompletedGreenIcon from '../icons/completed_green.svg?react'
import FailedWhiteIcon from '../icons/failed_white.svg?react'

import HighPerformanceIconSvg from '../icons/high_performance.svg?react'
import EnterpriseSecurityIconSvg from '../icons/enterprise_security.svg?react'
import MonitoringIconSvg from '../icons/monitoring.svg?react'
import ClickHouseOpsLogoBig from '../icons/clickhouse_ops_logo_big.svg?react'
import ClickHouseOpsLogoMedium from '../icons/clickhouse_ops_logo_medium.svg?react'

// Sidebar navigation icons - accept isActive prop to switch between gray/white
export const DashboardIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <DashboardGrayIcon width={20} height={20} style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }} />
)
export const QueryHistoryIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <QueryHistoryWhiteIcon width={20} height={20} style={{ filter: isActive ? 'none' : 'brightness(0) saturate(100%) invert(59%) sepia(8%) saturate(738%) hue-rotate(173deg) brightness(93%) contrast(87%)' }} />
)
export const TablesIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <TableWhiteIcon width={20} height={20} style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }} />
)
export const BackupsIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <BackupGrayIcon width={20} height={20} style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }} />
)
export const ClusterMonitorIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <DbGrayIcon width={20} height={20} style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }} />
)
export const ConfigurationIcon = ({ isActive = false }: { isActive?: boolean }) => (
  <ConfigGrayIcon width={20} height={20} style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }} />
)

// UI icons
export const MenuIcon = () => <MenuWhiteIcon width={20} height={20} />
export const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Metric card icons (with gradients from Figma)
export const MetricsIcon = ({ gradient }: { gradient: 'blue' | 'orange' | 'purple' | 'green' | 'yellow' }) => {
  const iconMap = {
    blue: CpuWhiteIcon,    // CPU Load - blue gradient
    purple: MemWhiteIcon,  // Memory Load - purple gradient
    orange: DiskWhiteIcon,  // Storage Used - orange gradient
    green: DbWhiteIcon,   // Active Connections - green gradient
    yellow: FlashWhiteIcon,  // Active Queries - yellow gradient
  }
  const IconComponent = iconMap[gradient]
  return <IconComponent width={24} height={24} />
}

// Profile menu icons
export const ProfileIcon = () => <ProfileGrayIcon width={16} height={16} />
export const SettingsIcon = () => <ConfigGrayIcon width={16} height={16} />
export const LightModeIcon = () => <SunYellowIcon width={16} height={16} />
export const LogoutIcon = () => <ExitGrayIcon width={16} height={16} />

// Logo icons - big for login page, medium for other pages
export const LogoIcon = ({ size = 'medium' }: { size?: 'medium' | 'big' }) => {
  if (size === 'big') {
    return <ClickHouseOpsLogoBig width={40} height={40} />
  }
  return <ClickHouseOpsLogoMedium width={24} height={24} />
}

// Feature icons for login page
export const HighPerformanceFeatureIcon = () => <HighPerformanceIconSvg width={24} height={24} />
export const EnterpriseSecurityFeatureIcon = () => <EnterpriseSecurityIconSvg width={24} height={24} />
export const MonitoringFeatureIcon = () => <MonitoringIconSvg width={24} height={24} />

// Node selector icon
export const NodeIcon = ({ width = 16, height = 16 }: { width?: number; height?: number }) => <NodeWhiteIcon width={width} height={height} />

// Query History metric icons
export const CompletedIcon = ({ width = 24, height = 24 }: { width?: number; height?: number }) => (
  <CompletedGreenIcon width={width} height={height} style={{ filter: 'brightness(0) invert(1)' }} />
)
export const FailedIcon = ({ width = 24, height = 24 }: { width?: number; height?: number }) => (
  <FailedWhiteIcon width={width} height={height} />
)

// Spinner icon component (animated)
export const SpinnerIcon = ({ width = 24, height = 24 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spinner-icon">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="62.83" strokeDashoffset="62.83" opacity="0.3" fill="none"/>
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="62.83" strokeDashoffset="47.12" opacity="0.9" fill="none" transform="rotate(-90 12 12)"/>
  </svg>
)

