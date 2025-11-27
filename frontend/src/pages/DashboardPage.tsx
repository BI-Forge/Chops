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

const MIN_REFRESH_INTERVAL_MS = 10_000
const MAX_REFRESH_INTERVAL_MS = 15 * 60 * 1000

const getRefreshIntervalMs = (period: PeriodOption): number => {
  const step = PERIOD_CONFIG[period].step
  const stepDuration = STEP_INFO[step].durationMs
  return Math.min(Math.max(stepDuration, MIN_REFRESH_INTERVAL_MS), MAX_REFRESH_INTERVAL_MS)
}

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
  
  // Storage key for dashboard filters
  const DASHBOARD_STORAGE_KEY = 'dashboardFilters'
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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

  // Track if filters were loaded from sessionStorage
  const filtersLoadedRef = useRef(false)

  // Load filters from sessionStorage on mount
  useEffect(() => {
    if (!isAuthenticated || filtersLoadedRef.current) return

    try {
      const savedFilters = sessionStorage.getItem(DASHBOARD_STORAGE_KEY)
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        if (filters.selectedNode !== undefined && filters.selectedNode) setSelectedNode(filters.selectedNode)
        if (filters.selectedPeriod !== undefined) setSelectedPeriod(filters.selectedPeriod)
        filtersLoadedRef.current = true
      } else {
        // No saved filters, mark as loaded
        filtersLoadedRef.current = true
      }
    } catch (err) {
      console.error('Failed to load dashboard filters from sessionStorage:', err)
      filtersLoadedRef.current = true
    }
  }, [isAuthenticated])

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    if (!isAuthenticated || !filtersLoadedRef.current) return

    try {
      const filters = {
        selectedNode,
        selectedPeriod,
      }
      sessionStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(filters))
    } catch (err) {
      console.error('Failed to save dashboard filters to sessionStorage:', err)
    }
  }, [selectedNode, selectedPeriod, isAuthenticated])

  // Load available nodes and validate/restore selected node
  useEffect(() => {
    if (!isAuthenticated) return

    const loadNodes = async () => {
      try {
        setLoading(true)
        setError(null)
        const availableNodes = await metricsAPI.getAvailableNodes()
        setNodes(availableNodes)

        if (availableNodes.length === 0) {
          setLoading(false)
          return
        }

        // Wait for filters to be loaded from sessionStorage before setting node
        if (!filtersLoadedRef.current) {
          // Retry after filters are loaded
          const checkInterval = setInterval(() => {
            if (filtersLoadedRef.current) {
              clearInterval(checkInterval)
              loadNodes()
            }
          }, 50)
          // Cleanup after 2 seconds max
          setTimeout(() => {
            clearInterval(checkInterval)
            setLoading(false)
          }, 2000)
          return
        }

        // If node is already selected and exists in available nodes, keep it
        if (selectedNode && availableNodes.includes(selectedNode)) {
          setLoading(false)
          return
        }

        // Try to restore saved node from sessionStorage
        let nodeToSet = null
        try {
          const savedFilters = sessionStorage.getItem(DASHBOARD_STORAGE_KEY)
          if (savedFilters) {
            const filters = JSON.parse(savedFilters)
            if (filters.selectedNode && availableNodes.includes(filters.selectedNode)) {
              nodeToSet = filters.selectedNode
            }
          }
        } catch (err) {
          // Ignore errors when checking saved node
        }

        // Set saved node if found, otherwise use first available
        if (nodeToSet) {
          setSelectedNode(nodeToSet)
        } else if (!selectedNode) {
          setSelectedNode(availableNodes[0])
        }

        setLoading(false)
      } catch (err) {
        setError('Failed to load nodes. Please refresh the page.')
        console.error('Failed to load nodes:', err)
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
    let refreshTimer: ReturnType<typeof window.setTimeout> | null = null

    const loadSeries = async (showLoader: boolean) => {
      if (cancelled) {
        return
      }

      if (showLoader) {
        setSeriesLoading(true)
      }
      setSeriesError(null)

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
        }, {} as Record<string, MetricChartPoint[]>)

        setSeriesData(nextData)
        setSeriesError(null)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load metric series:', err)
          setSeriesError('Failed to load chart data. Please try again.')
        }
      } finally {
        if (!cancelled && showLoader) {
          setSeriesLoading(false)
        }
      }
    }

    const scheduleRefresh = () => {
      if (cancelled) {
        return
      }

      const intervalMs = getRefreshIntervalMs(selectedPeriod)
      refreshTimer = window.setTimeout(async () => {
        if (cancelled) {
          return
        }

        try {
          await loadSeries(false)
        } finally {
          scheduleRefresh()
        }
      }, intervalMs)
    }

    loadSeries(true).finally(() => {
      if (!cancelled) {
        scheduleRefresh()
      }
    })

    return () => {
      cancelled = true
      if (refreshTimer) {
        window.clearTimeout(refreshTimer)
      }
      setSeriesLoading(false)
    }
  }, [selectedNode, selectedPeriod, currentInterval, isAuthenticated, refreshTrigger])

  const formatGB = (gb: number): string => {
    return gb.toFixed(0) + ' GB'
  }

  const handleManualRefresh = () => {
    if (!selectedNode || !isAuthenticated || seriesLoading) {
      return
    }
    setRefreshTrigger((prev) => prev + 1)
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
              <div className="dashboard-page__filters-actions">
                <button
                  type="button"
                  className="dashboard-page__refresh-button"
                  onClick={handleManualRefresh}
                  disabled={seriesLoading || !selectedNode}
                >
                  {seriesLoading ? (
                    <span className="dashboard-page__refresh-spinner" aria-hidden="true" />
                  ) : (
                    <svg
                      className="dashboard-page__refresh-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.93 4.93C7.78 2.08 12.22 2.08 15.07 4.93C17.04 6.9 17.83 9.66 17.27 12.23"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 5V11H13"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19.07 19.07C16.22 21.92 11.78 21.92 8.93 19.07C6.96 17.1 6.17 14.34 6.73 11.77"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 19V13H11"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <span>Refresh</span>
                </button>
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
