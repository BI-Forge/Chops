interface ClickhouseOpsLogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'light' | 'dark'
  iconOnly?: boolean
}

export function ClickhouseOpsLogo({
  size = 'medium',
  variant = 'light',
  iconOnly = false,
}: ClickhouseOpsLogoProps) {
  const sizes = {
    small: {
      container: '32px',
      icon: '32px',
      text: '16px',
      opsText: '12px',
    },
    medium: {
      container: '48px',
      icon: '48px',
      text: '24px',
      opsText: '14px',
    },
    large: {
      container: '96px',
      icon: '96px',
      text: '48px',
      opsText: '20px',
    },
  }

  const colors = {
    default: {
      gradient1: '#fbbf24',
      gradient2: '#f59e0b',
      gradient3: '#d97706',
      text: '#1f2937',
      ops: '#ca8a04',
    },
    light: {
      gradient1: '#fde047',
      gradient2: '#fbbf24',
      gradient3: '#f59e0b',
      text: '#ffffff',
      ops: '#fbbf24',
    },
    dark: {
      gradient1: '#78350f',
      gradient2: '#92400e',
      gradient3: '#a16207',
      text: '#1f2937',
      ops: '#78350f',
    },
  }

  const currentSize = sizes[size]
  const currentColors = colors[variant]
  const gradientId = `gradient-${variant}-${size}`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: iconOnly ? '0' : '16px',
        justifyContent: iconOnly ? 'center' : 'flex-start',
        width: iconOnly ? currentSize.icon : 'auto',
      }}
    >
      {/* Icon - Database with lightning bolt symbolizing fast operations */}
      <div style={{ position: 'relative' }}>
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentColors.gradient1} />
              <stop offset="50%" stopColor={currentColors.gradient2} />
              <stop offset="100%" stopColor={currentColors.gradient3} />
            </linearGradient>
          </defs>

          {/* Database cylinder - top */}
          <ellipse
            cx="50"
            cy="25"
            rx="30"
            ry="12"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />

          {/* Database cylinder - body */}
          <rect x="20" y="25" width="60" height="50" fill={`url(#${gradientId})`} opacity="0.8" />

          {/* Database layers */}
          <ellipse
            cx="50"
            cy="40"
            rx="30"
            ry="12"
            fill="none"
            stroke={currentColors.gradient1}
            strokeWidth="2"
            opacity="0.6"
          />
          <ellipse
            cx="50"
            cy="55"
            rx="30"
            ry="12"
            fill="none"
            stroke={currentColors.gradient1}
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Database cylinder - bottom */}
          <ellipse
            cx="50"
            cy="75"
            rx="30"
            ry="12"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />

          {/* Lightning bolt for OPS/Operations */}
          <path
            d="M 65 15 L 55 40 L 65 40 L 55 65 L 75 35 L 65 35 Z"
            fill={currentColors.gradient1}
            stroke={currentColors.gradient3}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* Click cursor element */}
          <g transform="translate(15, 60)">
            <path
              d="M 0 0 L 0 18 L 6 14 L 9 20 L 12 19 L 9 13 L 15 13 Z"
              fill={currentColors.gradient1}
              stroke={currentColors.gradient3}
              strokeWidth="1"
              opacity="0.9"
            />
          </g>
        </svg>
      </div>

      {/* Text */}
      {!iconOnly && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: currentSize.text,
              color: currentColors.text,
              letterSpacing: '-0.025em',
              lineHeight: '1.2',
            }}
          >
            <span style={{ fontWeight: 300 }}>Click</span>
            <span>house</span>
          </div>
          <div
            style={{
              fontSize: currentSize.opsText,
              color: currentColors.ops,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: '1.2',
            }}
          >
            Operations
          </div>
        </div>
      )}
    </div>
  )
}

