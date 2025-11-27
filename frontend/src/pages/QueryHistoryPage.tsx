import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../services/AuthContext'
import { metricsAPI } from '../services/metricsAPI'
import { queryAPI, type QueryLogEntry, type QueryLogFilter, type Process, type QueryLogStatsResponse } from '../services/queryAPI'
import QueryHistoryMetricCard from '../components/QueryHistoryMetricCard'
import MetricChartCard, { type MetricChartPoint } from '../components/MetricChartCard'
import NodeSelectorDropdown from '../components/NodeSelectorDropdown'
import FilterSelect from '../components/FilterSelect'
import { SpinnerIcon, CompletedIcon, FailedIcon } from '../components/Icons'
import '../styles/QueryHistoryPage.css'

type TimePreset = '10s' | '30s' | '1m' | '5m' | '15m'

interface TimePresetOption {
  value: TimePreset
  label: string
}

const TIME_PRESETS: TimePresetOption[] = [
  { value: '10s', label: 'Last 10 seconds' },
  { value: '30s', label: 'Last 30 seconds' },
  { value: '1m', label: 'Last 1 minute' },
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
]

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP',
  'BY',
  'ORDER',
  'LIMIT',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'ON',
  'AND',
  'OR',
  'NOT',
  'UNION',
  'ALL',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'DROP',
  'ALTER',
  'ADD',
  'DISTINCT',
  'HAVING',
]

const keywordRegex = new RegExp(`\\b(${SQL_KEYWORDS.join('|')})\\b`, 'gi')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const highlightSql = (value: string) => {
  const escaped = escapeHtml(value)
  return escaped.replace(keywordRegex, (match) => `<span class="query-history-page__sql-keyword">${match.toUpperCase()}</span>`)
}

const QueryHistoryPage = () => {
  const { isAuthenticated } = useAuth()
  const [nodes, setNodes] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<string>('')

  // Query log state
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([])
  const [queryLogLoading, setQueryLogLoading] = useState(false)
  const [queryLogError, setQueryLogError] = useState<string | null>(null)
  const [queryLogTotal, setQueryLogTotal] = useState(0)
  const [queryLogPage, setQueryLogPage] = useState(0)
  const [queryLogLimit] = useState(50)
  const [selectedTimePreset, setSelectedTimePreset] = useState<TimePreset>('15m')

  // Query log stats state
  const [queryLogStats, setQueryLogStats] = useState<QueryLogStatsResponse>({ running: 0, finished: 0, error: 0 })

  // Current processes state
  const [currentProcesses, setCurrentProcesses] = useState<Process[]>([])
  const [processesLoading, setProcessesLoading] = useState(false)
  const [processesError, setProcessesError] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const [killingQueryId, setKillingQueryId] = useState<string | null>(null)

  // Filters state (input values)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Applied filters state (used in API queries)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('')
  const [appliedUser, setAppliedUser] = useState<string>('all')
  const [appliedStatus, setAppliedStatus] = useState<string>('all')
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('')
  const [appliedDateTo, setAppliedDateTo] = useState<string>('')

  // Available users from ClickHouse
  const [availableUsers, setAvailableUsers] = useState<string[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Chart data state
  const [memoryChartData, setMemoryChartData] = useState<MetricChartPoint[]>([])
  const [cpuChartData, setCpuChartData] = useState<MetricChartPoint[]>([])
  const [chartsLoading, setChartsLoading] = useState(false)

  // Query modal state
  const [expandedQuery, setExpandedQuery] = useState<QueryLogEntry | null>(null)

  // Selected queries for visualization
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set())

  // Storage key for filters
  const FILTERS_STORAGE_KEY = 'queryHistoryFilters'

  // Summary metrics - use stats from API instead of computed from queryLog
  const runningQueriesCount = queryLogStats.running
  const completedQueriesCount = queryLogStats.finished
  const failedQueriesCount = queryLogStats.error

  // Load available nodes
  useEffect(() => {
    const loadNodes = async () => {
      if (!isAuthenticated) return

      try {
        const availableNodes = await metricsAPI.getAvailableNodes()
        setNodes(availableNodes)
        if (availableNodes.length > 0 && !selectedNode) {
          setSelectedNode(availableNodes[0])
        }
      } catch (err) {
        console.error('Failed to load nodes:', err)
      }
    }

    loadNodes()
  }, [isAuthenticated, selectedNode])

  // Load available users from ClickHouse for selected node
  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedNode || !isAuthenticated) {
        setAvailableUsers([])
        return
      }

      setUsersLoading(true)
      try {
        const response = await queryAPI.getUsers(selectedNode)
        setAvailableUsers(response.users || [])
        // Reset user filter when node changes
        setSelectedUser('all')
        setAppliedUser('all')
      } catch (err) {
        console.error('Failed to load users:', err)
        setAvailableUsers([])
      } finally {
        setUsersLoading(false)
      }
    }

    loadUsers()
  }, [selectedNode, isAuthenticated])

  // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO format (YYYY-MM-DDTHH:mm:ss)
  const formatDateTimeForAPI = (datetimeLocal: string): string | undefined => {
    if (!datetimeLocal) return undefined
    // datetime-local returns YYYY-MM-DDTHH:mm, we need YYYY-MM-DDTHH:mm:ss
    if (datetimeLocal.length === 16) {
      return `${datetimeLocal}:00`
    }
    return datetimeLocal
  }

  // Apply filters - called on Enter key or Refresh button
  const applyFilters = () => {
    setAppliedSearchQuery(searchQuery)
    setAppliedUser(selectedUser)
    setAppliedStatus(selectedStatus)
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setQueryLogPage(0)
  }

  // Track if filters were loaded from sessionStorage
  const filtersLoadedRef = useRef(false)

  // Load filters from sessionStorage on mount
  useEffect(() => {
    if (!isAuthenticated || filtersLoadedRef.current) return

    try {
      const savedFilters = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        if (filters.searchQuery !== undefined) setSearchQuery(filters.searchQuery)
        if (filters.selectedUser !== undefined) setSelectedUser(filters.selectedUser)
        if (filters.selectedStatus !== undefined) setSelectedStatus(filters.selectedStatus)
        if (filters.dateFrom !== undefined) setDateFrom(filters.dateFrom)
        if (filters.dateTo !== undefined) setDateTo(filters.dateTo)
        if (filters.selectedTimePreset !== undefined) setSelectedTimePreset(filters.selectedTimePreset)

        // Apply saved filters
        setAppliedSearchQuery(filters.searchQuery || '')
        setAppliedUser(filters.selectedUser || 'all')
        setAppliedStatus(filters.selectedStatus || 'all')
        setAppliedDateFrom(filters.dateFrom || '')
        setAppliedDateTo(filters.dateTo || '')
        filtersLoadedRef.current = true
      } else {
        // No saved filters, mark as loaded
        filtersLoadedRef.current = true
      }
    } catch (err) {
      console.error('Failed to load filters from sessionStorage:', err)
      filtersLoadedRef.current = true
    }
  }, [isAuthenticated])

  // Save filters to sessionStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (!isAuthenticated || !filtersLoadedRef.current) return

    try {
      const filters = {
        searchQuery,
        selectedUser,
        selectedStatus,
        dateFrom,
        dateTo,
        selectedTimePreset,
      }
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch (err) {
      console.error('Failed to save filters to sessionStorage:', err)
    }
  }, [searchQuery, selectedUser, selectedStatus, dateFrom, dateTo, selectedTimePreset, isAuthenticated])

  // Apply filters automatically on initial load and when node changes
  useEffect(() => {
    if (selectedNode && isAuthenticated && filtersLoadedRef.current) {
      applyFilters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, isAuthenticated])

  // Load query log stats (without pagination)
  useEffect(() => {
    const loadQueryLogStats = async () => {
      if (!selectedNode || !isAuthenticated) {
        return
      }

      try {
        // Use preset only if from/to are not specified
        const usePreset = !appliedDateFrom && !appliedDateTo

        const filter: Omit<QueryLogFilter, 'limit' | 'offset'> = {
          node: selectedNode,
          last: usePreset ? selectedTimePreset : undefined,
          from: formatDateTimeForAPI(appliedDateFrom),
          to: formatDateTimeForAPI(appliedDateTo),
          user: appliedUser !== 'all' ? appliedUser : undefined,
          search: appliedSearchQuery.trim() || undefined,
        }

        const stats = await queryAPI.getQueryLogStats(filter)
        setQueryLogStats(stats)
      } catch (err) {
        console.error('Failed to load query log stats:', err)
        // Don't show error to user, just keep previous stats
      }
    }

    loadQueryLogStats()
  }, [selectedNode, selectedTimePreset, appliedDateFrom, appliedDateTo, appliedUser, appliedSearchQuery, isAuthenticated])

  // Load query log
  useEffect(() => {
    const loadQueryLog = async () => {
      if (!selectedNode || !isAuthenticated) {
        return
      }

      setQueryLogLoading(true)
      setQueryLogError(null)

      try {
        // Use preset only if from/to are not specified
        const usePreset = !appliedDateFrom && !appliedDateTo

        const filter: QueryLogFilter = {
          node: selectedNode,
          last: usePreset ? selectedTimePreset : undefined,
          from: formatDateTimeForAPI(appliedDateFrom),
          to: formatDateTimeForAPI(appliedDateTo),
          user: appliedUser !== 'all' ? appliedUser : undefined,
          search: appliedSearchQuery.trim() || undefined,
          status: appliedStatus !== 'all' ? appliedStatus : undefined,
          limit: queryLogLimit,
          offset: queryLogPage * queryLogLimit,
        }

        const response = await queryAPI.getQueryLog(filter)
        console.log('Query log response:', {
          itemsCount: response.items.length,
          total: response.pagination.total,
          filter: filter,
        })
        setQueryLog(response.items)
        setQueryLogTotal(response.pagination.total)
      } catch (err) {
        console.error('Failed to load query log:', err)
        setQueryLogError('Failed to load query history. Please try again.')
      } finally {
        setQueryLogLoading(false)
      }
    }

    loadQueryLog()
  }, [selectedNode, selectedTimePreset, appliedDateFrom, appliedDateTo, appliedUser, appliedSearchQuery, appliedStatus, queryLogPage, queryLogLimit, isAuthenticated])

  // Load and stream current processes
  useEffect(() => {
    if (!selectedNode || !isAuthenticated) {
      return
    }

    const loadAndStreamProcesses = async () => {
      // Initial load
      setProcessesLoading(true)
      setProcessesError(null)

      try {
        const response = await queryAPI.getCurrentProcesses(selectedNode)
        setCurrentProcesses(response.processes || [])
      } catch (err) {
        console.error('Failed to load processes:', err)
        setProcessesError('Failed to load current queries. Please try again.')
      } finally {
        setProcessesLoading(false)
      }

      // Setup SSE stream
      if (sseRef.current) {
        sseRef.current.close()
      }

      sseRef.current = queryAPI.streamProcesses(
        selectedNode,
        (processes) => {
          setCurrentProcesses(processes || [])
          setProcessesError(null)
        },
        (error) => {
          console.error('SSE error:', error)
          setProcessesError('Connection error. Please refresh the page.')
        }
      )

      return () => {
        if (sseRef.current) {
          sseRef.current.close()
          sseRef.current = null
        }
      }
    }

    loadAndStreamProcesses()

    return () => {
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [selectedNode, isAuthenticated])

  // Load chart data
  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedNode || !isAuthenticated) {
        return
      }

      setChartsLoading(true)

      try {
        // Load memory and CPU metrics for the last 2 hours with 5-minute intervals
        // Use '2h' period but API might need different format, try '6h' as closest match
        const [memoryResponse, cpuResponse] = await Promise.all([
          metricsAPI.getMetricSeries(selectedNode, 'memory_used_gb', '6h', '5m'),
          metricsAPI.getMetricSeries(selectedNode, 'cpu_load', '6h', '5m'),
        ])

        setMemoryChartData(
          memoryResponse.points.map((p) => ({
            timestamp: p.timestamp,
            value: p.value,
          }))
        )

        setCpuChartData(
          cpuResponse.points.map((p) => ({
            timestamp: p.timestamp,
            value: p.value * 100, // Convert to percentage
          }))
        )
      } catch (err) {
        console.error('Failed to load chart data:', err)
      } finally {
        setChartsLoading(false)
      }
    }

    loadChartData()
  }, [selectedNode, isAuthenticated])

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(2)
    return `${minutes}m ${seconds}s`
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    } catch {
      return dateString
    }
  }

  const formatQueryId = (queryId: string): string => {
    const match = queryId.match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      return `Q${String(num).padStart(3, '0')}`
    }
    if (queryId.length >= 3) {
      const lastThree = queryId.slice(-3)
      if (/^\d+$/.test(lastThree)) {
        return `Q${lastThree.padStart(3, '0')}`
      }
      return `Q${queryId.slice(-3).padStart(3, '0').replace(/[^0-9]/g, '0')}`
    }
    return queryId
  }

  const handleKillQuery = async (queryId: string) => {
    // Prevent double-click
    if (killingQueryId === queryId) {
      return
    }

    if (!confirm('Are you sure you want to kill this query?')) {
      return
    }

    if (!selectedNode) {
      alert('No node selected. Please select a node first.')
      return
    }

    setKillingQueryId(queryId)
    try {
      await queryAPI.killProcess({ query_id: queryId, node: selectedNode })
      const response = await queryAPI.getCurrentProcesses(selectedNode)
      setCurrentProcesses(response.processes || [])
    } catch (err) {
      console.error('Failed to kill query:', err)
      alert('Failed to kill query. Please try again.')
    } finally {
      setKillingQueryId(null)
    }
  }

  // All filtering is done server-side now
  const filteredQueryLog = queryLog

  const totalQueryLogPages = Math.ceil(queryLogTotal / queryLogLimit)

  // Handle query selection
  const toggleQuerySelection = (queryId: string) => {
    setSelectedQueries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(queryId)) {
        newSet.delete(queryId)
      } else {
        newSet.add(queryId)
      }
      return newSet
    })
  }

  // Handle apply selected queries (for future visualization)
  const handleApplySelectedQueries = () => {
    const selected = Array.from(selectedQueries)
    console.log('Selected queries for visualization:', selected)
    // TODO: Implement visualization logic here
  }

  // Clear selection when filters change
  useEffect(() => {
    setSelectedQueries(new Set())
  }, [appliedSearchQuery, appliedUser, appliedStatus, appliedDateFrom, appliedDateTo, queryLogPage])

  // Convert Process to QueryLogEntry format for modal display
  const processToQueryLogEntry = (process: Process): QueryLogEntry => {
    return {
      node: process.node,
      event_time: process.query_start_time,
      event_time_microseconds: process.query_start_time,
      initial_user: process.user,
      user: process.user,
      query_id: process.query_id,
      query_kind: '',
      query_text: process.query,
      read_rows: process.read_rows,
      read_bytes: process.read_bytes,
      written_rows: process.written_rows,
      written_bytes: process.written_bytes,
      result_rows: 0,
      result_bytes: 0,
      memory_usage: process.memory_usage,
      duration_ms: process.query_duration_ms || process.elapsed * 1000,
      exception_code: 0, // Running queries have no exception
      exception: undefined,
      client_hostname: undefined,
      databases: process.current_database ? [process.current_database] : undefined,
      tables: undefined,
    }
  }

  const openQueryModal = (entry: QueryLogEntry | Process) => {
    if ('query' in entry) {
      // It's a Process, convert it
      setExpandedQuery(processToQueryLogEntry(entry as Process))
    } else {
      // It's already a QueryLogEntry
      setExpandedQuery(entry as QueryLogEntry)
    }
  }

  const closeQueryModal = () => {
    setExpandedQuery(null)
  }

  return (
    <div className="query-history-page">
      <div className="query-history-page__header">
        <div className="query-history-page__title-group">
          <h1 className="query-history-page__title">Query History</h1>
          <p className="query-history-page__subtitle">Monitor and analyze query performance</p>
        </div>
        {nodes.length > 0 && (
          <NodeSelectorDropdown nodes={nodes} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
        )}
      </div>

      {/* Summary Metrics */}
      <div className="query-history-page__metrics-grid">
        <QueryHistoryMetricCard title="Running Queries" value={runningQueriesCount} type="running" />
        <QueryHistoryMetricCard title="Completed Queries" value={completedQueriesCount} type="completed" />
        <QueryHistoryMetricCard title="Failed Queries" value={failedQueriesCount} type="failed" />
      </div>

      <div className="query-history-page__layout">
        {/* Main Content Area */}
        <div className="query-history-page__main-content">
          {/* Active Queries Section */}
          <div className="query-history-page__section query-history-page__section--active-queries">
            <div className="query-history-page__section-header">
              <h2 className="query-history-page__section-title">Active Queries</h2>
              {processesLoading && <span className="query-history-page__loading">Loading...</span>}
            </div>

            {processesError && <div className="query-history-page__error">{processesError}</div>}

            {!processesError && (
              <>
                {currentProcesses.length === 0 ? (
                  <div className="query-history-page__empty">No running queries</div>
                ) : (
                  <div className="query-history-page__cards">
                    {currentProcesses.map((process) => {
                      const queryId = process.query_id
                      const queryText = process.query
                      const user = process.user
                      const startTime = formatDateTime(process.query_start_time)
                      return (
                        <div key={queryId} className="query-history-page__card">
                          <div className="query-history-page__card-header">
                            <div className="query-history-page__card-icon-wrapper query-history-page__card-icon-wrapper--running">
                              <SpinnerIcon width={20} height={20} />
                            </div>
                            <div className="query-history-page__card-title-row">
                              <span className="query-history-page__card-query-id">{queryId}</span>
                              <span className="query-history-page__card-status query-history-page__card-status--running">running</span>
                            </div>
                            <button
                              className="query-history-page__kill-button"
                              onClick={() => handleKillQuery(queryId)}
                              disabled={killingQueryId === queryId}
                              title="Kill query"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                              KILL
                            </button>
                          </div>
                          <div className="query-history-page__card-query">
                            <button
                              className="query-history-page__card-query-button"
                              onClick={() => openQueryModal(process)}
                              type="button"
                            >
                              <code>{queryText || ''}</code>
                            </button>
                          </div>
                          <div className="query-history-page__card-meta">
                            <div className="query-history-page__card-meta-item">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z" fill="#90a1b9" />
                                <path d="M8 9C5.79086 9 4 10.7909 4 13V14H12V13C12 10.7909 10.2091 9 8 9Z" fill="#90a1b9" />
                              </svg>
                              <span>{user}</span>
                            </div>
                            <div className="query-history-page__card-meta-item">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="6" cy="6" r="5" stroke="#62748e" strokeWidth="1" />
                                <path d="M6 3V6L8 8" stroke="#62748e" strokeWidth="1" strokeLinecap="round" />
                              </svg>
                              <span>Started: {startTime}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Filters Section */}
          <div className="query-history-page__section">
            <div className="query-history-page__section-header">
              <h2 className="query-history-page__section-title">Filters</h2>
              <button
                className="query-history-page__refresh-button"
                onClick={applyFilters}
                type="button"
                title="Apply filters"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 8C14 4.68629 11.3137 2 8 2C6.67112 2 5.45746 2.44703 4.5 3.20437M2 8C2 11.3137 4.68629 14 8 14C9.32888 14 10.5425 13.553 11.5 12.7956M2 2L4.5 4.5M11.5 11.5L14 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Refresh
              </button>
            </div>
            <div className="query-history-page__filters">
              <div className="query-history-page__search-container">
                <label className="query-history-page__filters-label" htmlFor="search-query">
                  Search Query
                </label>
                <div className="query-history-page__search-input-wrapper">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="query-history-page__search-icon">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    id="search-query"
                    type="text"
                    className="query-history-page__search-input"
                    placeholder="Search queries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        applyFilters()
                      }
                    }}
                  />
                </div>
              </div>
              <div className="query-history-page__filters-group">
                <label className="query-history-page__filters-label" htmlFor="user-filter">
                  User
                </label>
                <FilterSelect
                  value={selectedUser}
                  options={[
                    { value: 'all', label: 'All Users' },
                    ...availableUsers.map((user) => ({ value: user, label: user })),
                  ]}
                  onChange={(value) => setSelectedUser(value)}
                  ariaLabel="User filter"
                  id="user-filter"
                  disabled={usersLoading || !selectedNode}
                />
              </div>
              <div className="query-history-page__filters-group">
                <label className="query-history-page__filters-label" htmlFor="status-filter">
                  Status
                </label>
                <FilterSelect
                  value={selectedStatus}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                  onChange={(value) => setSelectedStatus(value)}
                  ariaLabel="Status filter"
                  id="status-filter"
                />
              </div>
              <div className="query-history-page__filters-group">
                <label className="query-history-page__filters-label" htmlFor="date-range-filter">
                  Date Range
                </label>
                <FilterSelect
                  value={selectedTimePreset}
                  options={TIME_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                  onChange={(value) => {
                    setSelectedTimePreset(value as TimePreset)
                    setDateFrom('')
                    setDateTo('')
                    // Apply filters automatically when preset changes
                    setTimeout(() => {
                      setAppliedDateFrom('')
                      setAppliedDateTo('')
                      applyFilters()
                    }, 0)
                  }}
                  ariaLabel="Date range filter"
                  id="date-range-filter"
                />
              </div>
              <div className="query-history-page__filters-group">
                <label className="query-history-page__filters-label" htmlFor="date-from-filter">
                  Date From
                </label>
                <input
                  id="date-from-filter"
                  type="datetime-local"
                  className="query-history-page__date-input"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    if (e.target.value) {
                      setSelectedTimePreset('15m') // Reset preset when manual date is set
                    }
                  }}
                />
              </div>
              <div className="query-history-page__filters-group">
                <label className="query-history-page__filters-label" htmlFor="date-to-filter">
                  Date To
                </label>
                <input
                  id="date-to-filter"
                  type="datetime-local"
                  className="query-history-page__date-input"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    if (e.target.value) {
                      setSelectedTimePreset('15m') // Reset preset when manual date is set
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="query-history-page__charts-grid">
            <div className="query-history-page__section">
              <div className="query-history-page__section-header">
                <h2 className="query-history-page__section-title">Memory Load Timeline</h2>
              </div>
              <MetricChartCard
                title="Memory Usage (GB)"
                data={memoryChartData}
                colorFrom="#f59e0b"
                colorTo="#fbbf24"
                strokeColor="#f59e0b"
                valueFormatter={(value) => `${value.toFixed(2)} GB`}
                isLoading={chartsLoading}
              />
            </div>

            <div className="query-history-page__section">
              <div className="query-history-page__section-header">
                <h2 className="query-history-page__section-title">CPU Load Timeline</h2>
              </div>
              <MetricChartCard
                title="CPU Usage (%)"
                data={cpuChartData}
                colorFrom="#3b82f6"
                colorTo="#60a5fa"
                strokeColor="#3b82f6"
                valueFormatter={(value) => `${value.toFixed(0)}%`}
                isLoading={chartsLoading}
              />
            </div>
          </div>

          {/* Query History Section */}
          <div className="query-history-page__section">
            <div className="query-history-page__section-header">
              <h2 className="query-history-page__section-title">Query History</h2>
              {queryLogLoading && <span className="query-history-page__loading">Loading...</span>}
            </div>

            {queryLogError && <div className="query-history-page__error">{queryLogError}</div>}

            {!queryLogError && (
              <>
                {filteredQueryLog.length === 0 ? (
                  <div className="query-history-page__empty">No queries found</div>
                ) : (
                  <>
                    {selectedQueries.size > 0 && (
                      <div className="query-history-page__selected-actions">
                        <span className="query-history-page__selected-count">
                          {selectedQueries.size} query{selectedQueries.size !== 1 ? 'ies' : ''} selected
                        </span>
                        <button
                          className="query-history-page__apply-selected-button"
                          onClick={handleApplySelectedQueries}
                          type="button"
                        >
                          Apply Selected
                        </button>
                      </div>
                    )}
                    <div className="query-history-page__cards">
                      {filteredQueryLog.map((entry, index) => {
                        const startTime = formatDateTime(entry.event_time)
                        const startDate = new Date(entry.event_time)
                        const endDate = new Date(startDate.getTime() + (entry.duration_ms || 0))
                        const endTime = formatDateTime(endDate.toISOString())
                        const isSuccess = !entry.exception_code || entry.exception_code === 0

                        const isSelected = selectedQueries.has(entry.query_id)

                        return (
                          <div key={`${entry.query_id}-${index}`} className="query-history-page__card">
                            <div className="query-history-page__card-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="query-history-page__card-checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuerySelection(entry.query_id)}
                                aria-label={`Select query ${entry.query_id}`}
                              />
                            </div>
                            <div className="query-history-page__card-header">
                              <div className={`query-history-page__card-icon-wrapper ${isSuccess ? 'query-history-page__card-icon-wrapper--completed' : 'query-history-page__card-icon-wrapper--failed'}`}>
                                {isSuccess ? <CompletedIcon width={20} height={20} /> : <FailedIcon width={20} height={20} />}
                              </div>
                              <div className="query-history-page__card-title-row">
                                <span className="query-history-page__card-query-id">{entry.query_id}</span>
                                <span className={`query-history-page__card-status ${isSuccess ? 'query-history-page__card-status--completed' : 'query-history-page__card-status--error'}`}>
                                  {isSuccess ? 'completed' : 'error'}
                                </span>
                              </div>
                            </div>
                            <div className="query-history-page__card-query">
                              <button
                                className="query-history-page__card-query-button"
                                onClick={() => openQueryModal(entry)}
                                type="button"
                              >
                                <code>{entry.query_text || ''}</code>
                              </button>
                            </div>
                            <div className="query-history-page__card-meta">
                              <div className="query-history-page__card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z" fill="#90a1b9" />
                                  <path d="M8 9C5.79086 9 4 10.7909 4 13V14H12V13C12 10.7909 10.2091 9 8 9Z" fill="#90a1b9" />
                                </svg>
                                <span>{entry.user}</span>
                              </div>
                              <div className="query-history-page__card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="8" cy="8" r="6" stroke="#90a1b9" strokeWidth="1.5" />
                                  <path d="M8 4V8L11 11" stroke="#90a1b9" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <span>{entry.node}</span>
                              </div>
                              <div className="query-history-page__card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 2H13V14H3V2Z" stroke="#90a1b9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M3 6H13" stroke="#90a1b9" strokeWidth="1.5" />
                                </svg>
                                <span>{formatBytes(entry.memory_usage || 0)}</span>
                              </div>
                              <div className="query-history-page__card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="8" cy="8" r="6" stroke="#90a1b9" strokeWidth="1.5" />
                                  <path d="M8 4V8L11 11" stroke="#90a1b9" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <span>{formatDuration(entry.duration_ms || 0)}</span>
                              </div>
                            </div>
                            <div className="query-history-page__card-time">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="6" cy="6" r="5" stroke="#62748e" strokeWidth="1" />
                                <path d="M6 3V6L8 8" stroke="#62748e" strokeWidth="1" strokeLinecap="round" />
                              </svg>
                              <span>{startTime}</span>
                              <span className="query-history-page__card-time-separator">→</span>
                              <span>{endTime}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination */}
                    {totalQueryLogPages > 1 && (
                      <div className="query-history-page__pagination">
                        <button
                          className="query-history-page__pagination-button"
                          onClick={() => setQueryLogPage((prev) => Math.max(0, prev - 1))}
                          disabled={queryLogPage === 0 || queryLogLoading}
                        >
                          Previous
                        </button>
                        <span className="query-history-page__pagination-info">
                          Page {queryLogPage + 1} of {totalQueryLogPages} ({queryLogTotal} total)
                        </span>
                        <button
                          className="query-history-page__pagination-button"
                          onClick={() => setQueryLogPage((prev) => Math.min(totalQueryLogPages - 1, prev + 1))}
                          disabled={queryLogPage >= totalQueryLogPages - 1 || queryLogLoading}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {expandedQuery && (
        <div className="query-history-page__modal-overlay" onClick={closeQueryModal}>
          <div
            className="query-history-page__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="query-modal-title"
          >
            <div className="query-history-page__modal-header">
              <h3 id="query-modal-title">Query: {formatQueryId(expandedQuery.query_id)}</h3>
              <button className="query-history-page__modal-close" onClick={closeQueryModal} aria-label="Close query preview">
                ×
              </button>
            </div>
            <div className="query-history-page__modal-body">
              <div className="query-history-page__modal-content">
                <div className="query-history-page__modal-query-section">
                  <div className="query-history-page__modal-query-header">Query Text</div>
                  <div className="query-history-page__modal-query-text">
                    <pre dangerouslySetInnerHTML={{ __html: highlightSql(expandedQuery.query_text || '') }}></pre>
                  </div>
                </div>
                <div className="query-history-page__modal-info-section">
                  <div className="query-history-page__modal-info-header">Query Information</div>
                  <div className="query-history-page__modal-info-content">
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Query ID:</span>
                      <span className="query-history-page__modal-info-value">{expandedQuery.query_id}</span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">User:</span>
                      <span className="query-history-page__modal-info-value">{expandedQuery.user}</span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Start Time:</span>
                      <span className="query-history-page__modal-info-value">{formatDateTime(expandedQuery.event_time)}</span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Duration:</span>
                      <span className="query-history-page__modal-info-value">
                        {expandedQuery.duration_ms ? `${(expandedQuery.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                      </span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Memory Usage:</span>
                      <span className="query-history-page__modal-info-value">
                        {expandedQuery.memory_usage ? `${(expandedQuery.memory_usage / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Read Bytes:</span>
                      <span className="query-history-page__modal-info-value">
                        {expandedQuery.read_bytes ? `${(expandedQuery.read_bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Written Bytes:</span>
                      <span className="query-history-page__modal-info-value">
                        {expandedQuery.written_bytes ? `${(expandedQuery.written_bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="query-history-page__modal-info-item">
                      <span className="query-history-page__modal-info-label">Status:</span>
                      <span className={`query-history-page__modal-info-value query-history-page__modal-info-value--${!expandedQuery.exception_code || expandedQuery.exception_code === 0 ? 'success' : 'error'}`}>
                        {!expandedQuery.exception_code || expandedQuery.exception_code === 0 ? 'Completed' : 'Failed'}
                      </span>
                    </div>
                    {expandedQuery.exception && (
                      <div className="query-history-page__modal-info-item query-history-page__modal-info-item--full">
                        <span className="query-history-page__modal-info-label">Error:</span>
                        <span className="query-history-page__modal-info-value query-history-page__modal-info-value--error">{expandedQuery.exception}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueryHistoryPage
