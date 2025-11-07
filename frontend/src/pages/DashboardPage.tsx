import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { metricsAPI } from '../services/metricsAPI'
import type { SystemMetrics } from '../types/metrics'
import { useLayout } from '../components/Layout'
import { MenuIcon, LogoIcon } from '../components/Icons'
import MetricCard from '../components/MetricCard'
import NodeSelectorDropdown from '../components/NodeSelectorDropdown'
import MetricChartCard, { MetricChartPoint } from '../components/MetricChartCard'
import type { MetricSeriesPoint } from '../types/metrics'
import '../styles/DashboardPage.css'

type PeriodOption = '1h' | '6h' | '12h' | '1d' | '3d' | '7d'
type IntervalOption = '1s' | '10s' | '1m' | '10m' | '1h'

interface MetricChartConfig {
  key: string
  title: string
  subtitle?: string
  colorFrom: string
  colorTo: string
  stroke: string
  formatValue: (value: number) => string
  transform?: (value: number) => number
}

const STEP_DURATION_MS: Record<IntervalOption, number> = {
  '1s': 1_000,
  '10s': 10_000,
  '1m': 60_000,
  '10m': 600_000,
  '1h': 3_600_000,
}

const STEP_OPTIONS: Array<{ value: IntervalOption; label: string; durationMs: number }> = [
  { value: '1s', label: '1 second', durationMs: STEP_DURATION_MS['1s'] },
  { value: '10s', label: '10 seconds', durationMs: STEP_DURATION_MS['10s'] },
  { value: '1m', label: '1 minute', durationMs: STEP_DURATION_MS['1m'] },
  { value: '10m', label: '10 minutes', durationMs: STEP_DURATION_MS['10m'] },
  { value: '1h', label: '1 hour', durationMs: STEP_DURATION_MS['1h'] },
]

const PERIOD_CONFIG: Record<PeriodOption, { label: string; minStep: IntervalOption; durationMs: number }> = {
  '1h': { label: 'Last 1 hour', minStep: '1s', durationMs: 1 * 60 * 60 * 1000 },
  '6h': { label: 'Last 6 hours', minStep: '10s', durationMs: 6 * 60 * 60 * 1000 },
  '12h': { label: 'Last 12 hours', minStep: '1m', durationMs: 12 * 60 * 60 * 1000 },
  '1d': { label: 'Last 1 day', minStep: '1m', durationMs: 24 * 60 * 60 * 1000 },
  '3d': { label: 'Last 3 days', minStep: '1h', durationMs: 3 * 24 * 60 * 60 * 1000 },
  '7d': { label: 'Last 7 days', minStep: '1h', durationMs: 7 * 24 * 60 * 60 * 1000 },
}

const METRIC_CHART_CONFIGS: MetricChartConfig[] = [
  {
    key: 'cpu_load',
    title: 'CPU Usage (%)',
    subtitle: 'Average CPU load over time',
    colorFrom: '#3b82f6',
    colorTo: '#06b6d4',
    stroke: '#3b82f6',
    formatValue: (value) => `${value.toFixed(0)}%`,
    transform: (value) => value * 100,
  },
  {
    key: 'memory_used_gb',
    title: 'Memory Usage (GB)',
    subtitle: 'Total memory consumption',
    colorFrom: '#a855f7',
    colorTo: '#ec4899',
    stroke: '#a855f7',
    formatValue: (value) => `${value.toFixed(1)} GB`,
  },
  {
    key: 'storage_used',
    title: 'Storage Used (GB)',
    subtitle: 'Allocated disk usage',
    colorFrom: '#f97316',
    colorTo: '#ef4444',
    stroke: '#f97316',
    formatValue: (value) => `${value.toFixed(1)} GB`,
  },
  {
    key: 'active_queries',
    title: 'Active Queries',
    subtitle: 'Running queries count',
    colorFrom: '#eab308',
    colorTo: '#f59e0b',
    stroke: '#eab308',
    formatValue: (value) => Math.round(value).toLocaleString(),
  },
]

const PERIOD_ORDER: PeriodOption[] = ['1h', '6h', '12h', '1d', '3d', '7d']
const PERIOD_OPTIONS = PERIOD_ORDER.map((value) => ({ value, label: PERIOD_CONFIG[value].label }))

const DashboardPage = () => {
  const { isAuthenticated } = useAuth()
  const { openMobileMenu } = useLayout()
  const navigate = useNavigate()
  const [nodes, setNodes] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1h')
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>('1s')
  const [seriesData, setSeriesData] = useState<Record<string, MetricChartPoint[]>>(() =>
    METRIC_CHART_CONFIGS.reduce((acc, config) => {
      acc[config.key] = []
      return acc
    }, {} as Record<string, MetricChartPoint[]>)
  )
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const allowedStepOptions = useMemo(() => {
    const minStep = PERIOD_CONFIG[selectedPeriod].minStep
    const minDuration = STEP_DURATION_MS[minStep]
    return STEP_OPTIONS.filter((option) => option.durationMs >= minDuration)
  }, [selectedPeriod])

  useEffect(() => {
    if (!allowedStepOptions.some((option) => option.value === selectedInterval)) {
      if (allowedStepOptions.length > 0) {
        setSelectedInterval(allowedStepOptions[0].value)
      }
    }
  }, [allowedStepOptions, selectedInterval])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Load available nodes
  useEffect(() => {
    if (!isAuthenticated) return

    const loadNodes = async () => {
      try {
        setLoading(true)
        setError(null)
        const availableNodes = await metricsAPI.getAvailableNodes()
        setNodes(availableNodes)
        if (availableNodes.length > 0 && !selectedNode) {
          setSelectedNode(availableNodes[0])
        }
      } catch (err) {
        setError('Failed to load nodes. Please refresh the page.')
        console.error('Failed to load nodes:', err)
      } finally {
        setLoading(false)
      }
    }

    loadNodes()
  }, [isAuthenticated])

  // Load initial metrics and setup SSE connection when node is selected
  useEffect(() => {
    if (!selectedNode || !isAuthenticated) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Load initial metrics immediately
    const loadInitialMetrics = async () => {
      try {
        setLoading(true)
        setError(null)
        const initialMetrics = await metricsAPI.getCurrentMetrics(selectedNode)
        setMetrics(initialMetrics)
        setError(null)
      } catch (err) {
        console.error('Failed to load initial metrics:', err)
        setError('Failed to load initial metrics. Retrying...')
        // Retry after a short delay
        setTimeout(() => {
          if (selectedNode) {
            loadInitialMetrics()
          }
        }, 1000)
        return
      } finally {
        setLoading(false)
      }
    }

    loadInitialMetrics()

    // Setup SSE connection
    const token = localStorage.getItem('token')
    const url = `/api/v1/metrics/stream?node=${encodeURIComponent(selectedNode)}${token ? `&token=${token}` : ''}`

    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      console.log('SSE connection opened')
      setError(null)
    }

    eventSource.addEventListener('metrics', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setMetrics(data)
        setError(null)
      } catch (err) {
        console.error('Failed to parse metrics:', err)
        setError('Failed to parse metrics data')
      }
    })

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setError(data.error || 'Unknown error')
      } catch (err) {
        console.error('SSE error event:', err)
      }
    })

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // Only show error if connection was established and then failed
      if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
        // Try to reconnect after a delay
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED && selectedNode) {
            setError('Connection lost. Reconnecting...')
            // Trigger reconnection by updating selectedNode
            const currentNode = selectedNode
            setSelectedNode('')
            setTimeout(() => setSelectedNode(currentNode), 500)
          }
        }, 1000)
      }
    }

    eventSourceRef.current = eventSource

    // Cleanup on unmount or node change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [selectedNode, isAuthenticated])

  useEffect(() => {
    if (!selectedNode || !isAuthenticated) {
      return
    }

    let cancelled = false
    setSeriesLoading(true)
    setSeriesError(null)

    const loadSeries = async () => {
      try {
        const responses = await Promise.all(
          METRIC_CHART_CONFIGS.map((config) =>
            metricsAPI.getMetricSeries(selectedNode, config.key, selectedPeriod, selectedInterval)
          )
        )

        if (cancelled) {
          return
        }

        const nextData = responses.reduce((acc, response, index) => {
          const config = METRIC_CHART_CONFIGS[index]
          acc[config.key] = response.points.map((point: MetricSeriesPoint) => ({
            timestamp: point.timestamp,
            value: config.transform ? config.transform(point.value) : point.value,
          }))
          return acc
        }, {} as Record<string, MetricChartPoint[]>)

        setSeriesData(nextData)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load metric series:', err)
          setSeriesError('Failed to load chart data. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setSeriesLoading(false)
        }
      }
    }

    loadSeries()

    return () => {
      cancelled = true
    }
  }, [selectedNode, selectedPeriod, selectedInterval, isAuthenticated])

  const formatGB = (gb: number): string => {
    return gb.toFixed(0) + ' GB'
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="dashboard-page">
        {/* Mobile Header */}
        <div className="dashboard-page__mobile-header">
          <div className="dashboard-page__mobile-logo">
            <div className="dashboard-page__mobile-logo-icon">
              <LogoIcon />
            </div>
            <div className="dashboard-page__mobile-logo-text">
              <h1>ClickHouse</h1>
              <p>Operations Panel</p>
            </div>
          </div>
          <button className="dashboard-page__mobile-menu-button" onClick={openMobileMenu}>
            <MenuIcon />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="dashboard-page__header">
          <div className="dashboard-page__header-content">
            <div>
              <h1 className="dashboard-page__title">Dashboard</h1>
              <p className="dashboard-page__subtitle">Monitor your ClickHouse cluster performance</p>
            </div>
            <div className="dashboard-page__node-selector-wrapper">
              <NodeSelectorDropdown
                nodes={nodes}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
              />
            </div>
          </div>
        </div>

        {error && <div className="dashboard-page__error">{error}</div>}

        {metrics && (
          <div className="dashboard-page__metrics-grid">
            <MetricCard
              title="CPU Load"
              value={`${(metrics.cpu_load * 100).toFixed(0)}%`}
              iconGradient="blue"
            />
            <MetricCard
              title="Memory Load"
              value={`${metrics.memory_used_gb.toFixed(1)} GB`}
              iconGradient="purple"
            />
            <MetricCard
              title="Storage Used"
              value={`${formatGB(metrics.disk_used_gb)} (${metrics.disk_usage.toFixed(0)}%)`}
              iconGradient="orange"
            />
            <MetricCard
              title="Active Connections"
              value={metrics.active_conns.toLocaleString()}
              iconGradient="green"
            />
            <MetricCard
              title="Active Queries"
              value={metrics.active_queries.toString()}
              iconGradient="yellow"
            />
          </div>
        )}

        {selectedNode && (
          <>
            <div className="dashboard-page__filters-card">
              <div className="dashboard-page__filters-group">
                <label className="dashboard-page__filters-label" htmlFor="interval-select">
                  Interval
                </label>
                <select
                  id="interval-select"
                  className="dashboard-page__filters-select"
                  value={selectedInterval}
                  onChange={(event) => setSelectedInterval(event.target.value as IntervalOption)}
                >
                  {allowedStepOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="dashboard-page__filters-group">
                <label className="dashboard-page__filters-label" htmlFor="period-select">
                  Period
                </label>
                <select
                  id="period-select"
                  className="dashboard-page__filters-select"
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value as PeriodOption)}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dashboard-page__charts-grid">
              {METRIC_CHART_CONFIGS.map((config) => (
                <MetricChartCard
                  key={config.key}
                  title={config.title}
                  subtitle={config.subtitle}
                  data={seriesData[config.key] || []}
                  colorFrom={config.colorFrom}
                  colorTo={config.colorTo}
                  strokeColor={config.stroke}
                  valueFormatter={config.formatValue}
                  isLoading={seriesLoading}
                  errorMessage={seriesError}
                />
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className="dashboard-page__loading">
            <div className="dashboard-page__loading-spinner"></div>
            <p>Loading metrics...</p>
          </div>
        )}
        {!metrics && !loading && selectedNode && !error && (
          <div className="dashboard-page__loading">No metrics available</div>
        )}
      </div>
  )
}

export default DashboardPage
