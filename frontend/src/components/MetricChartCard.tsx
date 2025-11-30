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
      data.map((point) => {
        const timestamp = new Date(point.timestamp).getTime()
        return {
          ...point,
          timestampValue: timestamp,
          label: new Date(point.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }
      }),
    [data]
  )

  const xTicks = useMemo(() => {
    const seenMinutes = new Set<number>()
    const ticks: number[] = []
    const minuteMs = 60 * 1000

    formattedData.forEach((point) => {
      const timestamp = point.timestampValue
      const minuteBucket = Math.floor(timestamp / minuteMs)
      if (!seenMinutes.has(minuteBucket)) {
        seenMinutes.add(minuteBucket)
        ticks.push(timestamp)
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
                dataKey="timestampValue"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                ticks={xTicks}
                tickFormatter={(value) => {
                  return new Date(value).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
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
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0 && payload[0].payload) {
                    const timestamp = payload[0].payload.timestamp
                    if (timestamp) {
                      return new Date(timestamp).toLocaleString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    }
                  }
                  return label
                }}
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
