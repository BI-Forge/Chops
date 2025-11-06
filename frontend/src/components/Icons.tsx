import Icon1 from '../icons/icon_1.svg?react'
import Icon2 from '../icons/icon_2.svg?react'
import Icon3 from '../icons/icon_3.svg?react'
import Icon4 from '../icons/icon_4.svg?react'
import Icon5 from '../icons/icon_5.svg?react'
import Icon6 from '../icons/icon_6.svg?react'
import Icon7 from '../icons/icon_7.svg?react'
import Icon8 from '../icons/icon_8.svg?react'
import Icon9 from '../icons/icon_9.svg?react'
import Icon10 from '../icons/icon_10.svg?react'
import Icon11 from '../icons/icon_11.svg?react'
import Icon12 from '../icons/icon_12.svg?react'
import Icon13 from '../icons/icon_13.svg?react'
import Icon14 from '../icons/icon_14.svg?react'
import Icon15 from '../icons/icon_15.svg?react'
import Icon16 from '../icons/icon_16.svg?react'
import Icon17 from '../icons/icon_17.svg?react'
import Icon18 from '../icons/icon_18.svg?react'

// Sidebar navigation icons
export const DashboardIcon = () => <Icon18 width={20} height={20} />
export const QueryConsoleIcon = () => <Icon6 width={20} height={20} />
export const QueryHistoryIcon = () => <Icon16 width={20} height={20} />
export const TablesIcon = () => <Icon7 width={20} height={20} />
export const BackupsIcon = () => <Icon8 width={20} height={20} />
export const ClusterMonitorIcon = () => <Icon9 width={20} height={20} />
export const ConfigurationIcon = () => <Icon10 width={20} height={20} />

// UI icons
export const MenuIcon = () => <Icon15 width={20} height={20} />
export const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Metric card icons (with gradients from Figma)
export const MetricsIcon = ({ gradient }: { gradient: 'blue' | 'orange' | 'purple' | 'green' | 'yellow' }) => {
  const iconMap = {
    blue: Icon5,    // CPU Load - blue gradient
    purple: Icon1,  // Memory Load - purple gradient
    orange: Icon2,  // Storage Used - orange gradient
    green: Icon3,   // Active Connections - green gradient
    yellow: Icon4,  // Active Queries - yellow gradient
  }
  const IconComponent = iconMap[gradient]
  return <IconComponent width={64} height={64} />
}

// Profile menu icons
export const ProfileIcon = () => <Icon12 width={16} height={16} />
export const SettingsIcon = () => <Icon13 width={16} height={16} />
export const LightModeIcon = () => <Icon14 width={16} height={16} />
export const LogoutIcon = () => <Icon15 width={16} height={16} />

// Logo icon (icon_17 - возле названия)
export const LogoIcon = () => <Icon17 width={40} height={40} />

// Node selector icon (icon_11 - селектор нод)
export const NodeIcon = ({ width = 16, height = 16 }: { width?: number; height?: number }) => <Icon11 width={width} height={height} />

