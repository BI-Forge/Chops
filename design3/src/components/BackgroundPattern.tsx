import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export function BackgroundPattern() {
  const { theme } = useTheme();
  // Generate random binary code strings for data stream effect
  const binaryStrings = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    text: Array.from({ length: 20 }, () => Math.random() > 0.5 ? '1' : '0').join(' '),
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 20}s`,
    duration: `${40 + Math.random() * 20}s`
  }));

  // Generate floating data particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`,
    duration: `${8 + Math.random() * 8}s`
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden ${theme === 'light' ? 'bg-gray-50' : 'bg-black'}`}>
      {/* Base gradient layer */}
      <div className={`absolute inset-0 ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-amber-50 via-gray-50 to-orange-50' 
          : 'bg-gradient-to-br from-gray-950 via-black to-gray-950'
      }`} />
      
      {/* Hexagonal grid pattern - BigData style */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Hexagon pattern */}
          <pattern id="hexagon-pattern" x="0" y="0" width="100" height="86.6" patternUnits="userSpaceOnUse">
            <path
              d="M 25 0 L 75 0 L 100 43.3 L 75 86.6 L 25 86.6 L 0 43.3 Z"
              fill="none"
              stroke={theme === 'light' ? '#f59e0b' : '#fbbf24'}
              strokeWidth="0.5"
              opacity={theme === 'light' ? '0.12' : '0.06'}
            />
          </pattern>

          {/* Network nodes pattern */}
          <pattern id="network-pattern" x="0" y="0" width="150" height="150" patternUnits="userSpaceOnUse">
            {/* Nodes */}
            <circle cx="25" cy="25" r="2" fill={theme === 'light' ? '#f59e0b' : '#fde047'} opacity={theme === 'light' ? '0.15' : '0.08'} />
            <circle cx="75" cy="50" r="2" fill={theme === 'light' ? '#d97706' : '#fbbf24'} opacity={theme === 'light' ? '0.15' : '0.08'} />
            <circle cx="125" cy="25" r="2" fill={theme === 'light' ? '#f59e0b' : '#f59e0b'} opacity={theme === 'light' ? '0.15' : '0.08'} />
            <circle cx="50" cy="100" r="2" fill={theme === 'light' ? '#f59e0b' : '#fde047'} opacity={theme === 'light' ? '0.15' : '0.08'} />
            <circle cx="100" cy="125" r="2" fill={theme === 'light' ? '#d97706' : '#fbbf24'} opacity={theme === 'light' ? '0.15' : '0.08'} />
            
            {/* Connection lines */}
            <line x1="25" y1="25" x2="75" y2="50" stroke={theme === 'light' ? '#d97706' : '#fbbf24'} strokeWidth="0.5" opacity={theme === 'light' ? '0.08' : '0.04'} />
            <line x1="75" y1="50" x2="125" y2="25" stroke={theme === 'light' ? '#f59e0b' : '#fde047'} strokeWidth="0.5" opacity={theme === 'light' ? '0.08' : '0.04'} />
            <line x1="75" y1="50" x2="50" y2="100" stroke={theme === 'light' ? '#f59e0b' : '#f59e0b'} strokeWidth="0.5" opacity={theme === 'light' ? '0.08' : '0.04'} />
            <line x1="50" y1="100" x2="100" y2="125" stroke={theme === 'light' ? '#d97706' : '#fbbf24'} strokeWidth="0.5" opacity={theme === 'light' ? '0.08' : '0.04'} />
          </pattern>

          {/* Data blocks pattern */}
          <pattern id="data-blocks" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect x="10" y="10" width="15" height="3" rx="1" fill={theme === 'light' ? '#f59e0b' : '#fde047'} opacity={theme === 'light' ? '0.08' : '0.04'} />
            <rect x="10" y="15" width="10" height="3" rx="1" fill={theme === 'light' ? '#d97706' : '#fbbf24'} opacity={theme === 'light' ? '0.08' : '0.04'} />
            <rect x="10" y="20" width="12" height="3" rx="1" fill={theme === 'light' ? '#f59e0b' : '#f59e0b'} opacity={theme === 'light' ? '0.08' : '0.04'} />
            
            <rect x="80" y="60" width="15" height="3" rx="1" fill={theme === 'light' ? '#d97706' : '#fbbf24'} opacity={theme === 'light' ? '0.08' : '0.04'} />
            <rect x="80" y="65" width="10" height="3" rx="1" fill={theme === 'light' ? '#f59e0b' : '#fde047'} opacity={theme === 'light' ? '0.08' : '0.04'} />
            <rect x="80" y="70" width="12" height="3" rx="1" fill={theme === 'light' ? '#f59e0b' : '#f59e0b'} opacity={theme === 'light' ? '0.08' : '0.04'} />
          </pattern>

          {/* Radial gradient for vignette */}
          <radialGradient id="vignette">
            <stop offset="0%" stopColor={theme === 'light' ? '#ffffff' : '#000000'} stopOpacity="0" />
            <stop offset="100%" stopColor={theme === 'light' ? '#f59e0b' : '#000000'} stopOpacity={theme === 'light' ? '0.08' : '0.4'} />
          </radialGradient>
        </defs>

        {/* Apply hexagon pattern */}
        <rect width="100%" height="100%" fill="url(#hexagon-pattern)" />
        
        {/* Apply network pattern */}
        <rect width="100%" height="100%" fill="url(#network-pattern)" />
        
        {/* Apply data blocks pattern */}
        <rect width="100%" height="100%" fill="url(#data-blocks)" />

        {/* Apply vignette */}
        <rect width="100%" height="100%" fill="url(#vignette)" />
      </svg>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: theme === 'light'
            ? "linear-gradient(rgba(245, 158, 11, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(251, 191, 36, 0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.012) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Animated binary code streams - BigData feel */}
      <div className="absolute inset-0 overflow-hidden">
        {binaryStrings.map((item) => (
          <div
            key={item.id}
            className={`absolute ${theme === 'light' ? 'text-amber-600/25' : 'text-yellow-500/30'} text-xs font-mono whitespace-nowrap`}
            style={{
              left: item.left,
              bottom: '-20px',
              animation: `float-up ${item.duration} linear ${item.delay} infinite`,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Floating data particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute rounded-full ${theme === 'light' ? 'bg-amber-500/30' : 'bg-yellow-400/40'}`}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: particle.left,
              top: particle.top,
              animation: `pulse-glow ${particle.duration} ease-in-out ${particle.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Subtle animated glow effect */}
      <div
        className={`absolute top-1/4 left-1/4 w-96 h-96 ${theme === 'light' ? 'bg-amber-300/15' : 'bg-yellow-500/10'} rounded-full blur-3xl`}
        style={{
          animation: 'drift 25s ease-in-out infinite',
        }}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${theme === 'light' ? 'bg-orange-400/12' : 'bg-amber-500/10'} rounded-full blur-3xl`}
        style={{
          animation: 'drift 30s ease-in-out 5s infinite',
        }}
      />
      
      {/* Left sidebar glow - подчеркивает прозрачность сайдбара */}
      <div
        className={`absolute left-0 top-1/3 w-64 h-96 ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-amber-400/25 via-orange-400/15 to-transparent' 
            : 'bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-transparent'
        } rounded-full blur-3xl`}
        style={{
          animation: 'sidebar-glow 20s ease-in-out infinite',
        }}
      />
      <div
        className={`absolute left-0 bottom-1/4 w-48 h-64 ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-orange-400/20 via-amber-400/12 to-transparent' 
            : 'bg-gradient-to-r from-amber-400/15 via-yellow-400/10 to-transparent'
        } rounded-full blur-2xl`}
        style={{
          animation: 'sidebar-glow 15s ease-in-out 3s infinite',
        }}
      />

      {/* Scanning line effect - very subtle */}
      <div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/15 to-transparent"
        style={{
          animation: 'scan 15s linear infinite',
        }}
      />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float-up {
          from {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.2;
          }
          90% {
            opacity: 0.2;
          }
          to {
            transform: translateY(-100vh);
            opacity: 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
          }
        }

        @keyframes drift {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(20px, 30px);
          }
          50% {
            transform: translate(-10px, 50px);
          }
          75% {
            transform: translate(30px, 20px);
          }
        }

        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }

        @keyframes sidebar-glow {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          33% {
            transform: translateY(-30px) scale(1.1);
            opacity: 1;
          }
          66% {
            transform: translateY(20px) scale(0.9);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
