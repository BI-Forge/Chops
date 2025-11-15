import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import '../styles/MetricChartCard.css'

export interface MetricChartPoint {
  timestamp: string
  value: number
}

interface GradientStop {
  offset: string
  color: string
  opacity: number
}

interface MetricChartCardProps {
  title: string
  subtitle?: string
  data: MetricChartPoint[]
  colorFrom: string
  colorTo: string
  strokeColor: string
  valueFormatter: (value: number) => string
  gradientStops?: GradientStop[]
  isLoading?: boolean
  errorMessage?: string | null
  emptyMessage?: string
}

const MetricChartCard = ({
  title,
  subtitle,
  data,
  colorFrom,
  colorTo,
  strokeColor,
  valueFormatter,
  gradientStops,
  isLoading = false,
  errorMessage,
  emptyMessage = 'No data available for the selected range.',
}: MetricChartCardProps) => {
  const gradientId = useMemo(() => {
    const normalized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return `metric-gradient-${normalized}`
  }, [title])

  const resolvedGradientStops = useMemo<GradientStop[]>(() => {
    if (gradientStops && gradientStops.length > 0) {
      return gradientStops
    }

    return [
      { offset: '0%', color: colorFrom, opacity: 0.42 },
      { offset: '55%', color: colorTo, opacity: 0.16 },
      { offset: '95%', color: colorTo, opacity: 0 },
    ]
  }, [gradientStops, colorFrom, colorTo])

  const formattedData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: new Date(point.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    [data]
  )

  const xTicks = useMemo(() => {
    const seenMinutes = new Set<number>()
    const ticks: string[] = []

    formattedData.forEach((point) => {
      const minuteBucket = Math.floor(new Date(point.timestamp).getTime() / 60_000)
      if (!seenMinutes.has(minuteBucket)) {
        seenMinutes.add(minuteBucket)
        ticks.push(point.label)
      }
    })

    return ticks
  }, [formattedData])

  return (
    <div className="metric-chart-card">
      <div className="metric-chart-card__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="metric-chart-card__body">
        {isLoading ? (
          <div className="metric-chart-card__state">Loading chart...</div>
        ) : errorMessage ? (
          <div className="metric-chart-card__state metric-chart-card__state--error">{errorMessage}</div>
        ) : formattedData.length === 0 ? (
          <div className="metric-chart-card__state">{emptyMessage}</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={formattedData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  {resolvedGradientStops.map((stop) => (
                    <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                  ))}
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1d293d" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={xTicks}
                tick={{ fill: '#64748b', fontSize: 12 }}
                stroke="#1d293d"
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                stroke="#1d293d"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172b',
                  border: '1px solid #1d293d',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontFamily: 'Arimo, sans-serif',
                }}
                labelStyle={{ color: '#90a1b9' }}
                formatter={(value: number) => [valueFormatter(value), '']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default MetricChartCard
