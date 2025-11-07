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

interface MetricChartCardProps {
  title: string
  subtitle?: string
  data: MetricChartPoint[]
  colorFrom: string
  colorTo: string
  strokeColor: string
  valueFormatter: (value: number) => string
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
  isLoading = false,
  errorMessage,
  emptyMessage = 'No data available for the selected range.',
}: MetricChartCardProps) => {
  const gradientId = useMemo(() => `metric-gradient-${title.replace(/\s+/g, '-').toLowerCase()}`, [title])

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
                  <stop offset="0%" stopColor={colorFrom} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={colorTo} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1d293d" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
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
