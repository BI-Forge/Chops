import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const DashboardIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="M3 3H9V9H3V3ZM11 3H17V9H11V3ZM3 11H9V17H3V11ZM11 11H17V17H11V11Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
)

export const QueryConsoleIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M6 8H14M6 12H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const QueryHistoryIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const TablesIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="3" y="4" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const BackupsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="4" y="6" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M7 6V4C7 2.89543 7.89543 2 9 2H11C12.1046 2 13 2.89543 13 4V6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 10L10 7L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ClusterMonitorIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="3" y="4" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="7" cy="9" r="1" fill="currentColor" />
    <circle cx="10" cy="9" r="1" fill="currentColor" />
    <circle cx="13" cy="9" r="1" fill="currentColor" />
    <path d="M5 16H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const ConfigurationIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M10 2.5L12.5 7.5L18 10L12.5 12.5L10 17.5L7.5 12.5L2 10L7.5 7.5L10 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
)

export const ServerIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="3" y="3" width="14" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="3" y="10" width="14" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="5.5" r="0.5" fill="currentColor" />
    <circle cx="6" cy="12.5" r="0.5" fill="currentColor" />
  </svg>
)

export const ChevronDownIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ChartIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 3V21H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 16L11 12L15 16L21 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const LightningIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const StorageIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
    <path d="M7 6V4C7 2.89543 7.89543 2 9 2H15C16.1046 2 17 2.89543 17 4V6" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const ConnectionIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="8" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="16" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M11 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const MenuIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const UserIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M3 13.5C3 11.0147 5.01472 9 7.5 9H8.5C10.9853 9 13 11.0147 13 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export const SettingsIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M8 1V3M8 13V15M15 8H13M3 8H1M13.0711 2.92893L11.6569 4.34314M4.34314 11.6569L2.92893 13.0711M13.0711 13.0711L11.6569 11.6569M4.34314 4.34314L2.92893 2.92893"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export const SunIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M8 1V2M8 14V15M15 8H14M2 8H1M13.364 2.636L12.657 3.343M3.343 12.657L2.636 13.364M13.364 13.364L12.657 12.657M3.343 3.343L2.636 2.636" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const LogoutIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 11L13 8L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

