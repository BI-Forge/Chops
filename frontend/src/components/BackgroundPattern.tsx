import '../styles/BackgroundPattern.css'

export function BackgroundPattern() {
  return (
    <div className="background-pattern">
      {/* Base gradient background - dark theme */}
      <div className="background-pattern__gradient" />

      {/* SVG Pattern overlay */}
      <svg
        className="background-pattern__svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main pattern definition */}
          <pattern
            id="clickhouse-pattern"
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Database cylinder icon - subtle */}
            <g opacity="0.12">
              <ellipse
                cx="50"
                cy="40"
                rx="15"
                ry="6"
                fill="#fbbf24"
              />
              <rect
                x="35"
                y="40"
                width="30"
                height="25"
                fill="#f59e0b"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="15"
                ry="6"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1"
              />
              <ellipse
                cx="50"
                cy="65"
                rx="15"
                ry="6"
                fill="#f59e0b"
              />
            </g>

            {/* Lightning bolt - very subtle */}
            <g opacity="0.15">
              <path
                d="M 155 55 L 150 70 L 155 70 L 150 85 L 162 68 L 157 68 Z"
                fill="#fde047"
                stroke="#fbbf24"
                strokeWidth="0.5"
              />
            </g>

            {/* Click cursor - subtle */}
            <g opacity="0.12" transform="translate(30, 150)">
              <path
                d="M 0 0 L 0 12 L 4 9 L 6 14 L 8 13 L 6 8 L 10 8 Z"
                fill="#fde047"
                stroke="#fbbf24"
                strokeWidth="0.5"
              />
            </g>

            {/* Small dots pattern */}
            <circle
              cx="100"
              cy="50"
              r="2"
              fill="#fde047"
              opacity="0.15"
            />
            <circle
              cx="180"
              cy="120"
              r="2"
              fill="#fbbf24"
              opacity="0.15"
            />
            <circle
              cx="20"
              cy="100"
              r="2"
              fill="#f59e0b"
              opacity="0.15"
            />

            {/* Geometric lines - very subtle */}
            <line
              x1="0"
              y1="0"
              x2="20"
              y2="20"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.08"
            />
            <line
              x1="180"
              y1="0"
              x2="200"
              y2="20"
              stroke="#fde047"
              strokeWidth="1"
              opacity="0.08"
            />
            <line
              x1="0"
              y1="180"
              x2="20"
              y2="200"
              stroke="#f59e0b"
              strokeWidth="1"
              opacity="0.08"
            />

            {/* Small database stack */}
            <g opacity="0.1" transform="translate(140, 130)">
              <rect
                x="0"
                y="0"
                width="20"
                height="3"
                rx="1.5"
                fill="#fde047"
              />
              <rect
                x="0"
                y="5"
                width="20"
                height="3"
                rx="1.5"
                fill="#fbbf24"
              />
              <rect
                x="0"
                y="10"
                width="20"
                height="3"
                rx="1.5"
                fill="#f59e0b"
              />
            </g>

            {/* Circular tech elements */}
            <circle
              cx="90"
              cy="170"
              r="8"
              fill="none"
              stroke="#fde047"
              strokeWidth="1"
              opacity="0.12"
            />
            <circle
              cx="90"
              cy="170"
              r="5"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.12"
            />

            {/* Small grid element */}
            <g opacity="0.08">
              <rect
                x="165"
                y="25"
                width="8"
                height="8"
                fill="none"
                stroke="#fde047"
                strokeWidth="0.5"
              />
              <rect
                x="173"
                y="25"
                width="8"
                height="8"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="0.5"
              />
              <rect
                x="165"
                y="33"
                width="8"
                height="8"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.5"
              />
              <rect
                x="173"
                y="33"
                width="8"
                height="8"
                fill="none"
                stroke="#fde047"
                strokeWidth="0.5"
              />
            </g>
          </pattern>

          {/* Radial gradient overlay for vignette effect */}
          <radialGradient id="vignette">
            <stop
              offset="0%"
              stopColor="#000000"
              stopOpacity="0"
            />
            <stop
              offset="100%"
              stopColor="#000000"
              stopOpacity="0.4"
            />
          </radialGradient>

          {/* Subtle noise texture for depth */}
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feBlend mode="multiply" in="SourceGraphic" />
          </filter>
        </defs>

        {/* Apply the pattern */}
        <rect
          width="100%"
          height="100%"
          fill="url(#clickhouse-pattern)"
        />

        {/* Apply subtle vignette */}
        <rect
          width="100%"
          height="100%"
          fill="url(#vignette)"
        />
      </svg>

      {/* Subtle animated glow spots - dark theme */}
      <div
        className="background-pattern__glow background-pattern__glow--1"
      />
      <div
        className="background-pattern__glow background-pattern__glow--2"
      />
      <div
        className="background-pattern__glow background-pattern__glow--3"
      />

      {/* Grid lines overlay for tech feel */}
      <div className="background-pattern__grid" />
    </div>
  )
}

