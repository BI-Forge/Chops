import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { metricsAPI } from '../services/metricsAPI'
import type { SystemMetrics } from '../types/metrics'
import { useLayout } from '../components/Layout'
import { MenuIcon, LogoIcon } from '../components/Icons'
import MetricCard from '../components/MetricCard'
import NodeSelectorDropdown from '../components/NodeSelectorDropdown'
import FilterSelect from '../components/FilterSelect'
import MetricChartCard, { MetricChartPoint } from '../components/MetricChartCard'
import type { MetricSeriesPoint } from '../types/metrics'
import '../styles/DashboardPage.css'

interface MetricChartConfig {
  key: string
  title: string
  subtitle?: string
  colorFrom: string
  colorTo: string
  stroke: string
  formatValue: (value: number) => string
  transform?: (value: number) => number
  gradientStops?: { offset: string; color: string; opacity: number }[]
}

// Adjusted period and interval options
type PeriodOption = '10m' | '30m' | '1h' | '6h' | '12h' | '1d' | '3d' | '7d'
type IntervalOption = '1s' | '5s' | '10s' | '30s' | '1m' | '5m' | '30m' | '1h'

const STEP_INFO: Record<IntervalOption, { label: string; durationMs: number }> = {
  '1s': { label: '1 second', durationMs: 1_000 },
  '5s': { label: '5 seconds', durationMs: 5_000 },
  '10s': { label: '10 seconds', durationMs: 10_000 },
  '30s': { label: '30 seconds', durationMs: 30_000 },
  '1m': { label: '1 minute', durationMs: 60_000 },
  '5m': { label: '5 minutes', durationMs: 300_000 },
  '30m': { label: '30 minutes', durationMs: 1_800_000 },
  '1h': { label: '1 hour', durationMs: 3_600_000 },
}

const PERIOD_CONFIG: Record<PeriodOption, { label: string; step: IntervalOption; durationMs: number }> = {
  '10m': { label: 'Last 10 minutes', step: '1s', durationMs: 10 * 60 * 1000 },
  '30m': { label: 'Last 30 minutes', step: '10s', durationMs: 30 * 60 * 1000 },
  '1h': { label: 'Last 1 hour', step: '1m', durationMs: 1 * 60 * 60 * 1000 },
  '6h': { label: 'Last 6 hours', step: '5m', durationMs: 6 * 60 * 60 * 1000 },
  '12h': { label: 'Last 12 hours', step: '5m', durationMs: 12 * 60 * 60 * 1000 },
  '1d': { label: 'Last 1 day', step: '30m', durationMs: 24 * 60 * 60 * 1000 },
  '3d': { label: 'Last 3 days', step: '1h', durationMs: 3 * 24 * 60 * 60 * 1000 },
  '7d': { label: 'Last 7 days', step: '1h', durationMs: 7 * 24 * 60 * 60 * 1000 },
}

const PERIOD_ORDER: PeriodOption[] = ['10m', '30m', '1h', '6h', '12h', '1d', '3d', '7d']
const PERIOD_OPTIONS = PERIOD_ORDER.map((value) => ({ value, label: PERIOD_CONFIG[value].label }))

const METRIC_CHART_CONFIGS: MetricChartConfig[] = [
  {
    key: 'cpu_load',
    title: 'CPU Usage (%)',
    subtitle: 'Average CPU load over time',
    colorFrom: '#3b82f6',
    colorTo: '#60a5fa',
    stroke: '#3b82f6',
    formatValue: (value: number) => `${value.toFixed(0)}%`,
    transform: (value: number) => value * 100,
    gradientStops: [
      { offset: '0%', color: '#3b82f6', opacity: 0.42 },
      { offset: '55%', color: '#60a5fa', opacity: 0.18 },
      { offset: '95%', color: '#60a5fa', opacity: 0 },
    ],
  },
  {
    key: 'memory_used_gb',
    title: 'Memory Usage (GB)',
    subtitle: 'Total memory consumption',
    colorFrom: '#a855f7',
    colorTo: '#c084fc',
    stroke: '#a855f7',
    formatValue: (value: number) => `${value.toFixed(1)} GB`,
    gradientStops: [
      { offset: '0%', color: '#a855f7', opacity: 0.42 },
      { offset: '55%', color: '#c084fc', opacity: 0.18 },
      { offset: '95%', color: '#c084fc', opacity: 0 },
    ],
  },
  {
    key: 'storage_used',
    title: 'Storage Used (GB)',
    subtitle: 'Allocated disk usage',
    colorFrom: '#f97316',
    colorTo: '#fbbf24',
    stroke: '#fb923c',
    formatValue: (value: number) => `${value.toFixed(1)} GB`,
    gradientStops: [
      { offset: '0%', color: '#f97316', opacity: 0.46 },
      { offset: '45%', color: '#fbbf24', opacity: 0.24 },
      { offset: '95%', color: '#fbbf24', opacity: 0 },
    ],
  },
  {
    key: 'active_queries',
    title: 'Active Queries',
    subtitle: 'Running queries count',
    colorFrom: '#eab308',
    colorTo: '#facc15',
    stroke: '#eab308',
    formatValue: (value: number) => Math.round(value).toLocaleString(),
    gradientStops: [
      { offset: '0%', color: '#eab308', opacity: 0.42 },
      { offset: '55%', color: '#facc15', opacity: 0.18 },
      { offset: '95%', color: '#facc15', opacity: 0 },
    ],
  },
]

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
  const currentInterval = useMemo(() => PERIOD_CONFIG[selectedPeriod].step, [selectedPeriod])
  const currentIntervalLabel = useMemo(() => STEP_INFO[currentInterval].label, [currentInterval])
  const [seriesData, setSeriesData] = useState<Record<string, MetricChartPoint[]>>(() =>
    METRIC_CHART_CONFIGS.reduce((acc, config) => {
      acc[config.key] = []
      return acc
    }, {} as Record<string, MetricChartPoint[]>)
  )
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const activeStepOption = useMemo(
    () => ({ value: currentInterval, label: currentIntervalLabel }),
    [currentInterval, currentIntervalLabel]
  )

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
            metricsAPI.getMetricSeries(selectedNode, config.key, selectedPeriod, currentInterval)
          )
        )

        if (cancelled) {
          return
        }

        const nextData = responses.reduce<Record<string, MetricChartPoint[]>>((acc, response, index) => {
          const config = METRIC_CHART_CONFIGS[index]
          acc[config.key] = response.points.map((point: MetricSeriesPoint) => ({
            timestamp: point.timestamp,
            value: config.transform ? config.transform(point.value) : point.value,
          }))
          return acc
        }, {})
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
  }, [selectedNode, selectedPeriod, currentInterval, isAuthenticated])

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
                <label className="dashboard-page__filters-label" htmlFor="interval-filter">
                  Interval
                </label>
                <FilterSelect
                  value={activeStepOption.value}
                  options={[activeStepOption]}
                  onChange={() => {}}
                  disabled
                  ariaLabel="Interval filter"
                  id="interval-filter"
                />
              </div>
              <div className="dashboard-page__filters-group">
                <label className="dashboard-page__filters-label" htmlFor="period-filter">
                  Period
                </label>
                <FilterSelect
                  value={selectedPeriod}
                  options={PERIOD_OPTIONS}
                  onChange={(nextValue) => setSelectedPeriod(nextValue as PeriodOption)}
                  ariaLabel="Period filter"
                  id="period-filter"
                />
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
                  gradientStops={config.gradientStops}
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
