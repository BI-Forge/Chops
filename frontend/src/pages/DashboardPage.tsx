import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { metricsAPI } from '../services/metricsAPI'
import type { SystemMetrics } from '../types/metrics'
import { useLayout } from '../components/Layout'
import { MenuIcon, LogoIcon } from '../components/Icons'
import MetricCard from '../components/MetricCard'
import NodeSelectorDropdown from '../components/NodeSelectorDropdown'
import './DashboardPage.css'

const DashboardPage = () => {
  const { isAuthenticated } = useAuth()
  const { openMobileMenu } = useLayout()
  const navigate = useNavigate()
  const [nodes, setNodes] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)

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
