import React from 'react';

interface ClickhouseOpsLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'light' | 'dark';
  iconOnly?: boolean;
}

export function ClickhouseOpsLogo({ 
  size = 'medium', 
  variant = 'default',
  iconOnly = false 
}: ClickhouseOpsLogoProps) {
  const sizes = {
    small: {
      container: 'w-32',
      icon: 'w-10 h-10',
      text: 'text-lg',
      opsText: 'text-xs',
    },
    medium: {
      container: 'w-48',
      icon: 'w-14 h-14',
      text: 'text-2xl',
      opsText: 'text-sm',
    },
    large: {
      container: 'w-96',
      icon: 'w-24 h-24',
      text: 'text-5xl',
      opsText: 'text-xl',
    },
  };

  const colors = {
    default: {
      icon: 'text-amber-500',
      text: 'text-gray-800',
      ops: 'text-yellow-600',
      gradient1: '#fbbf24',
      gradient2: '#f59e0b',
      gradient3: '#d97706',
    },
    light: {
      icon: 'text-yellow-300',
      text: 'text-gray-900',
      ops: 'text-amber-700',
      gradient1: '#fde047',
      gradient2: '#fbbf24',
      gradient3: '#f59e0b',
    },
    dark: {
      icon: 'text-yellow-400',
      text: 'text-gray-100',
      ops: 'text-yellow-300',
      gradient1: '#fbbf24',
      gradient2: '#f59e0b',
      gradient3: '#d97706',
    },
  };

  const currentSize = sizes[size];
  const currentColors = colors[variant];

  return (
    <div className={`flex items-center gap-4 ${iconOnly ? 'justify-center' : ''}`}>
      {/* Icon - Database with lightning bolt symbolizing fast operations */}
      <div className="relative">
        <svg
          className={currentSize.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`gradient-${variant}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentColors.gradient1} />
              <stop offset="50%" stopColor={currentColors.gradient2} />
              <stop offset="100%" stopColor={currentColors.gradient3} />
            </linearGradient>
          </defs>
          
          {/* Database cylinder - top */}
          <ellipse cx="50" cy="25" rx="30" ry="12" fill={`url(#gradient-${variant}-${size})`} opacity="0.9" />
          
          {/* Database cylinder - body */}
          <rect x="20" y="25" width="60" height="50" fill={`url(#gradient-${variant}-${size})`} opacity="0.8" />
          
          {/* Database layers */}
          <ellipse cx="50" cy="40" rx="30" ry="12" fill="none" stroke={currentColors.gradient1} strokeWidth="2" opacity="0.6" />
          <ellipse cx="50" cy="55" rx="30" ry="12" fill="none" stroke={currentColors.gradient1} strokeWidth="2" opacity="0.6" />
          
          {/* Database cylinder - bottom */}
          <ellipse cx="50" cy="75" rx="30" ry="12" fill={`url(#gradient-${variant}-${size})`} opacity="0.9" />
          
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
        <div className="flex flex-col">
          <div className={`${currentSize.text} ${currentColors.text} tracking-tight`}>
            <span className="font-light">Click</span>
            <span>house</span>
          </div>
          <div className={`${currentSize.opsText} ${currentColors.ops} tracking-wider uppercase`}>
            Operations
          </div>
        </div>
      )}
    </div>
  );
}
