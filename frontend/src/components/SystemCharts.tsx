import { useCallback, useEffect, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import {
  AreaChart,
  BarChart3,
  Clock,
  Cpu,
  Database,
  FileText,
  HardDrive,
  LineChart,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  ScanSearch,
} from 'lucide-react'
import { TimeRangePicker, type TimeRangeValue } from './TimeRangePicker'
import { TimeSeriesChart } from './charts/TimeSeriesChart'
import type { ChartRenderType, TimeSeriesChartHandle } from './charts/TimeSeriesChart'
import { useTheme } from '../contexts/ThemeContext'
import { useAlert } from '../contexts/AlertContext'
import { metricsAPI } from '../services/metricsAPI'
import { isCanceledError } from '../services/api'
import { lastPointValue, seriesToPoints } from '../utils/chartSeries'
import type { TimeSeriesPoint } from '../utils/chartSeries'
import { formatDateForAPI } from '../utils/dateFormat'
import { displayStepForTimeRange, PERIOD_CONFIGURATIONS, validateAbsoluteRange } from '../utils/metricStep'

const DASHBOARD_TIME_RANGE_KEY = 'dashboardTimeRange'

function loadStoredTimeRange(): TimeRangeValue {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_TIME_RANGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TimeRangeValue
      if (parsed.kind === 'relative' && PERIOD_CONFIGURATIONS[parsed.period]) {
        return parsed
      }
      if (parsed.kind === 'absolute' && parsed.from && parsed.to) {
        return parsed
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return {
    kind: 'relative',
    period: sessionStorage.getItem('dashboardPeriod') || '1d',
  }
}

function getChartLoadErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as { error?: string; message?: string }
    return data.error || data.message || 'Unable to fetch chart data from the server'
  }
  return 'Unable to fetch chart data from the server'
}

const CHART_COLORS = {
  cpu: '#fbbf24',
  memory: '#f59e0b',
  storage: '#d97706',
  queries: '#f59e0b',
} as const

interface ChartCardProps {
  title: string
  icon: React.ReactNode
  currentValue: number
  unit: string
  points: TimeSeriesPoint[]
  color: string
  seriesName: string
  yMax?: number
  absoluteValue?: number
  absoluteUnit?: string
  swapDisplay?: boolean
}

function ChartCard({
  title,
  icon,
  currentValue,
  unit,
  points,
  color,
  seriesName,
  yMax,
  absoluteValue,
  absoluteUnit,
  swapDisplay,
}: ChartCardProps) {
  const { theme } = useTheme()
  const chartRef = useRef<TimeSeriesChartHandle>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [chartType, setChartType] = useState<ChartRenderType>('area')
  const [zoomSelect, setZoomSelect] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === cardRef.current)
      chartRef.current?.resize()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleZoomSelect = () => {
    const next = !zoomSelect
    setZoomSelect(next)
    chartRef.current?.setZoomSelect(next)
  }

  const toggleFullscreen = async () => {
    if (!cardRef.current) return
    try {
      if (document.fullscreenElement === cardRef.current) {
        await document.exitFullscreen()
        return
      }
      await cardRef.current.requestFullscreen()
    } catch {
      // Browser may deny fullscreen without a user gesture or permissions.
    }
  }

  const isLight = theme === 'light'

  return (
    <div
      ref={cardRef}
      className={`system-chart-card ${isLight ? 'system-chart-card--light' : ''}`}
    >
      <div className="system-chart-header">
        <div className="system-chart-title-wrapper">
          <div className="system-chart-icon">{icon}</div>
          <div>
            <h3 className="system-chart-title">{title}</h3>
            {swapDisplay && absoluteValue !== undefined && absoluteUnit ? (
              <div className="system-chart-metric">
                <span className="system-chart-metric-value">{currentValue}</span>
                <span className="system-chart-metric-unit">{unit}</span>
                <span className="system-chart-metric-secondary">
                  ({absoluteValue}{absoluteUnit})
                </span>
              </div>
            ) : (
              <>
                <div className="system-chart-metric">
                  <span className="system-chart-metric-value">{currentValue}{unit}</span>
                </div>
                {absoluteValue !== undefined && absoluteUnit && (
                  <div className="system-chart-metric-secondary">
                    {absoluteValue} {absoluteUnit}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="system-chart-controls" role="toolbar" aria-label={`${title} chart tools`}>
          <button
            type="button"
            className={`system-chart-control-btn ${zoomSelect ? 'is-active' : ''}`}
            title="Zoom range (Ctrl+wheel to zoom, drag to pan)"
            aria-label="Zoom range"
            aria-pressed={zoomSelect}
            onClick={toggleZoomSelect}
          >
            <ScanSearch className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="system-chart-control-btn"
            title="Reset zoom"
            aria-label="Reset zoom"
            onClick={() => {
              setZoomSelect(false)
              chartRef.current?.setZoomSelect(false)
              chartRef.current?.resetZoom()
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="system-chart-controls-sep" />
          <div role="radiogroup" aria-label="Chart type" className="system-chart-type-group">
            <button
              type="button"
              role="radio"
              className={`system-chart-control-btn ${chartType === 'area' ? 'is-active' : ''}`}
              title="Area"
              aria-label="Area chart"
              aria-checked={chartType === 'area'}
              onClick={() => setChartType('area')}
            >
              <AreaChart className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              role="radio"
              className={`system-chart-control-btn ${chartType === 'line' ? 'is-active' : ''}`}
              title="Line"
              aria-label="Line chart"
              aria-checked={chartType === 'line'}
              onClick={() => setChartType('line')}
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              role="radio"
              className={`system-chart-control-btn ${chartType === 'bar' ? 'is-active' : ''}`}
              title="Bar"
              aria-label="Bar chart"
              aria-checked={chartType === 'bar'}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="system-chart-controls-sep" />
          <button
            type="button"
            className={`system-chart-control-btn ${isFullscreen ? 'is-active' : ''}`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="system-chart-wrapper">
        <TimeSeriesChart
          ref={chartRef}
          points={points}
          color={color}
          unit={unit}
          seriesName={seriesName}
          theme={theme}
          chartType={chartType}
          yMax={yMax}
          zoomSelect={zoomSelect}
          onZoomSelectEnd={() => setZoomSelect(false)}
        />
      </div>
    </div>
  )
}

interface SystemChartsProps {
  selectedNode?: string
}

interface ChartSeriesState {
  cpu: TimeSeriesPoint[]
  memory: TimeSeriesPoint[]
  memoryGB: TimeSeriesPoint[]
  storage: TimeSeriesPoint[]
  queries: TimeSeriesPoint[]
}

// Fetched in one batch request (single backend scan) instead of one request per metric.
const CHART_METRICS = ['cpu_load', 'memory_load', 'memory_used_gb', 'storage_used', 'active_queries']

const emptySeries = (): ChartSeriesState => ({
  cpu: [],
  memory: [],
  memoryGB: [],
  storage: [],
  queries: [],
})

export function SystemCharts({ selectedNode = '' }: SystemChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(loadStoredTimeRange)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [series, setSeries] = useState<ChartSeriesState>(emptySeries)
  const [memoryTotalGB, setMemoryTotalGB] = useState(0)
  const [diskTotalGB, setDiskTotalGB] = useState(1000)
  const { theme } = useTheme()
  const { error: showError } = useAlert()
  const loadGen = useRef(0)
  const loadAbort = useRef<AbortController | null>(null)

  const handleTimeRangeChange = (next: TimeRangeValue) => {
    setTimeRange(next)
    sessionStorage.setItem(DASHBOARD_TIME_RANGE_KEY, JSON.stringify(next))
    if (next.kind === 'relative') {
      sessionStorage.setItem('dashboardPeriod', next.period)
    }
  }

  const interval = displayStepForTimeRange(timeRange)

  // Totals belong to a node: drop the previous node's values so a failed totals lookup
  // falls back to the defaults instead of another node's axis limits.
  useEffect(() => {
    setMemoryTotalGB(0)
    setDiskTotalGB(1000)
  }, [selectedNode])

  const loadChartData = useCallback(async () => {
    const expected = ++loadGen.current
    // Abort the superseded load's requests so the backend stops scanning for them.
    loadAbort.current?.abort()
    loadAbort.current = null
    if (!selectedNode) {
      setSeries(emptySeries())
      setIsRefreshing(false)
      return
    }

    let seriesOpts: { period?: string; step?: string; from?: string; to?: string }
    if (timeRange.kind === 'absolute') {
      const rangeError = validateAbsoluteRange(timeRange.from, timeRange.to)
      if (rangeError) {
        showError('Invalid date range', rangeError, 5000)
        setSeries(emptySeries())
        setIsRefreshing(false)
        return
      }
      const absoluteFrom = formatDateForAPI(timeRange.from)
      const absoluteTo = formatDateForAPI(timeRange.to)
      if (!absoluteFrom || !absoluteTo) {
        showError('Invalid date range', 'Unable to parse date range', 5000)
        setSeries(emptySeries())
        setIsRefreshing(false)
        return
      }
      seriesOpts = { from: absoluteFrom, to: absoluteTo }
    } else {
      const cfg = PERIOD_CONFIGURATIONS[timeRange.period] || PERIOD_CONFIGURATIONS['1d']
      seriesOpts = { period: cfg.apiPeriod, step: cfg.step }
    }

    const controller = new AbortController()
    loadAbort.current = controller

    // Totals only set the Memory/Storage y-axis limits. /current returns nothing when the
    // node has no snapshot in the last 10 minutes, so it is optional: run it alongside
    // the series and keep the current totals if it fails.
    const [totalsResult, batchResult] = await Promise.allSettled([
      metricsAPI.getCurrentMetricsQuiet(selectedNode, controller.signal),
      metricsAPI.getMetricSeriesBatch(selectedNode, CHART_METRICS, seriesOpts, controller.signal),
    ])

    if (loadGen.current !== expected) return
    if (loadAbort.current === controller) loadAbort.current = null

    if (totalsResult.status === 'fulfilled') {
      setMemoryTotalGB(Math.round(totalsResult.value.memory_total_gb))
      setDiskTotalGB(Math.round(totalsResult.value.disk_total_gb) || 1000)
    } else if (!isCanceledError(totalsResult.reason)) {
      console.warn('Chart totals unavailable, keeping current axis limits:', totalsResult.reason)
    }

    if (batchResult.status === 'fulfilled') {
      const batch = batchResult.value
      const pointsOf = (metric: string) => batch.series?.[metric] ?? []
      setSeries({
        cpu: seriesToPoints(pointsOf('cpu_load'), (v) => Math.round(v)),
        memory: seriesToPoints(pointsOf('memory_load'), (v) => Math.round(v)),
        memoryGB: seriesToPoints(pointsOf('memory_used_gb'), (v) => Math.round(v * 10) / 10),
        storage: seriesToPoints(pointsOf('storage_used'), (v) => Math.round(v * 10) / 10),
        queries: seriesToPoints(pointsOf('active_queries'), (v) => Math.round(v)),
      })
    } else if (!isCanceledError(batchResult.reason)) {
      console.error('Failed to load chart data:', batchResult.reason)
      showError('Failed to load charts', getChartLoadErrorMessage(batchResult.reason), 5000)
      setSeries(emptySeries())
    }
    setIsRefreshing(false)
  }, [selectedNode, timeRange, showError])

  useEffect(() => {
    loadChartData()
    return () => {
      loadGen.current += 1
      loadAbort.current?.abort()
      loadAbort.current = null
    }
  }, [loadChartData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadChartData()
  }

  return (
    <div className="space-y-6">
      <div
        className={`${
          theme === 'light'
            ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50'
            : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/30'
        } backdrop-blur-md rounded-xl p-4 border transition-all duration-300`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <TimeRangePicker value={timeRange} onChange={handleTimeRangeChange} />

          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            theme === 'light' ? 'bg-gray-100 border border-gray-300' : 'bg-gray-800/60 border border-gray-700/50'
          }`}>
            <Clock className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Interval: <span className="font-medium">{interval}</span>
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              theme === 'light'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
            } transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="system-charts-container">
        <ChartCard
          title="CPU Load"
          icon={<Cpu className="w-5 h-5" />}
          currentValue={lastPointValue(series.cpu)}
          unit="%"
          points={series.cpu}
          color={CHART_COLORS.cpu}
          seriesName="CPU"
          yMax={100}
        />
        <ChartCard
          title="Memory Load"
          icon={<Database className="w-5 h-5" />}
          currentValue={lastPointValue(series.memoryGB)}
          unit=" GB"
          absoluteValue={lastPointValue(series.memory)}
          absoluteUnit="%"
          swapDisplay
          points={series.memoryGB}
          color={CHART_COLORS.memory}
          seriesName="Memory"
          yMax={memoryTotalGB || undefined}
        />
        <ChartCard
          title="Storage Used"
          icon={<HardDrive className="w-5 h-5" />}
          currentValue={lastPointValue(series.storage)}
          unit=" GB"
          points={series.storage}
          color={CHART_COLORS.storage}
          seriesName="Storage"
          yMax={diskTotalGB || undefined}
        />
        <ChartCard
          title="Active Queries"
          icon={<FileText className="w-5 h-5" />}
          currentValue={lastPointValue(series.queries)}
          unit=""
          points={series.queries}
          color={CHART_COLORS.queries}
          seriesName="Queries"
        />
      </div>
    </div>
  )
}
