import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AreaChart,
  BarChart3,
  Calendar,
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
import { CustomSelect } from './CustomSelect'
import { TimeSeriesChart } from './charts/TimeSeriesChart'
import type { ChartRenderType, TimeSeriesChartHandle } from './charts/TimeSeriesChart'
import { useTheme } from '../contexts/ThemeContext'
import { useAlert } from '../contexts/AlertContext'
import { metricsAPI } from '../services/metricsAPI'
import { isCanceledError } from '../services/api'
import { lastPointValue, seriesToPoints } from '../utils/chartSeries'
import type { TimeSeriesPoint } from '../utils/chartSeries'

const CHART_COLORS = {
  cpu: '#fbbf24',
  memory: '#f59e0b',
  storage: '#d97706',
  queries: '#f59e0b',
} as const

const PERIOD_CONFIGURATIONS: Record<string, { apiPeriod: string; step: string; displayStep: string; label: string }> = {
  '10m': { apiPeriod: '10m', step: '1s', displayStep: '1s', label: 'Last 10 Minutes' },
  '30m': { apiPeriod: '30m', step: '10s', displayStep: '10s', label: 'Last 30 Minutes' },
  '1h': { apiPeriod: '1h', step: '1m', displayStep: '1m', label: 'Last 1 Hour' },
  '6h': { apiPeriod: '6h', step: '5m', displayStep: '5m', label: 'Last 6 Hours' },
  '12h': { apiPeriod: '12h', step: '5m', displayStep: '5m', label: 'Last 12 Hours' },
  '1d': { apiPeriod: '1d', step: '30m', displayStep: '30m', label: 'Last 24 Hours' },
  '3d': { apiPeriod: '3d', step: '1h', displayStep: '1h', label: 'Last 3 Days' },
  '7d': { apiPeriod: '7d', step: '1h', displayStep: '1h', label: 'Last 7 Days' },
}

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

const emptySeries = (): ChartSeriesState => ({
  cpu: [],
  memory: [],
  memoryGB: [],
  storage: [],
  queries: [],
})

export function SystemCharts({ selectedNode = '' }: SystemChartsProps) {
  const [period, setPeriod] = useState(() => sessionStorage.getItem('dashboardPeriod') || '1d')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [series, setSeries] = useState<ChartSeriesState>(emptySeries)
  const [memoryTotalGB, setMemoryTotalGB] = useState(0)
  const [diskTotalGB, setDiskTotalGB] = useState(1000)
  const { theme } = useTheme()
  const { error: showError } = useAlert()
  const loadGen = useRef(0)

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    sessionStorage.setItem('dashboardPeriod', newPeriod)
  }

  const periodConfig = PERIOD_CONFIGURATIONS[period] || PERIOD_CONFIGURATIONS['1d']
  const interval = periodConfig.displayStep

  const loadChartData = useCallback(async () => {
    const expected = ++loadGen.current
    if (!selectedNode) {
      setSeries(emptySeries())
      setIsRefreshing(false)
      return
    }

    try {
      const { apiPeriod, step } = PERIOD_CONFIGURATIONS[period] || PERIOD_CONFIGURATIONS['1d']
      const currentMetrics = await metricsAPI.getCurrentMetrics(selectedNode)
      if (loadGen.current !== expected) return
      setMemoryTotalGB(Math.round(currentMetrics.memory_total_gb))
      setDiskTotalGB(Math.round(currentMetrics.disk_total_gb) || 1000)

      const [cpuData, memoryPercentData, memoryGBData, diskData, queriesData] = await Promise.all([
        metricsAPI.getMetricSeries(selectedNode, 'cpu_load', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'memory_load', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'memory_used_gb', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'storage_used', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'active_queries', apiPeriod, step),
      ])

      if (loadGen.current !== expected) return

      setSeries({
        cpu: seriesToPoints(cpuData.points, (v) => Math.round(v)),
        memory: seriesToPoints(memoryPercentData.points, (v) => Math.round(v)),
        memoryGB: seriesToPoints(memoryGBData.points, (v) => Math.round(v * 10) / 10),
        storage: seriesToPoints(diskData.points, (v) => Math.round(v * 10) / 10),
        queries: seriesToPoints(queriesData.points, (v) => Math.round(v)),
      })
    } catch (error) {
      if (loadGen.current !== expected) return
      if (isCanceledError(error)) return
      console.error('Failed to load chart data:', error)
      showError('Failed to load charts', 'Unable to fetch chart data from the server', 5000)
      setSeries(emptySeries())
    } finally {
      if (loadGen.current === expected) {
        setIsRefreshing(false)
      }
    }
  }, [selectedNode, period, showError])

  useEffect(() => {
    loadChartData()
    return () => {
      loadGen.current += 1
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
          <CustomSelect
            value={period}
            onChange={handlePeriodChange}
            options={Object.entries(PERIOD_CONFIGURATIONS).map(([value, config]) => ({
              value,
              label: config.label,
            }))}
            icon={Calendar}
            label="Period:"
          />

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
