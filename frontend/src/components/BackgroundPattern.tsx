import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export function BackgroundPattern() {
    const { theme } = useTheme();

    return (
        <div className={`absolute inset-0 overflow-hidden ${theme === 'light' ? 'bg-gray-50' : 'bg-black'}`}>
            {/* Base gradient layer */}
            <div className={`absolute inset-0 ${
                theme === 'light'
                    ? 'bg-gradient-to-br from-amber-50 via-gray-50 to-orange-50'
                    : 'bg-gradient-to-br from-gray-950 via-black to-gray-950'
            }`} />

            {/* Static hexagonal grid pattern */}
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
        </div>
    );
}