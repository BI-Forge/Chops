import api from './api'

// Types for query log (snake_case to match API)
export interface QueryLogEntry {
  node: string
  event_time: string
  event_time_microseconds: string
  initial_user: string
  user: string
  query_id: string
  query_kind: string
  query_text: string
  read_rows: number
  read_bytes: number
  written_rows: number
  written_bytes: number
  result_rows: number
  result_bytes: number
  memory_usage: number
  duration_ms: number
  exception_code: number
  exception?: string
  client_hostname?: string
  databases?: string[]
  tables?: string[]
}

export interface QueryLogPagination {
  limit: number
  offset: number
  total: number
  range: {
    from: string
    to: string
    preset?: string
  }
}

export interface QueryLogResponse {
  items: QueryLogEntry[]
  pagination: QueryLogPagination
}

export interface QueryLogFilter {
  last?: string // '10s' | '30s' | '1m' | '5m' | '15m'
  from?: string
  to?: string
  user?: string
  node?: string
  limit?: number
  offset?: number
}

export interface QueryLogStatsResponse {
  running: number
  finished: number
  error: number
}

// Types for current processes
export interface Process {
  query_id: string
  user: string
  address: string
  elapsed: number // seconds
  read_rows: number
  read_bytes: number
  total_rows_approx: number
  written_rows: number
  written_bytes: number
  memory_usage: number
  query: string
  query_start_time: string // RFC3339
  query_duration_ms: number
  current_database: string
  node: string
  client_name?: string
  client_version?: string
  os_user?: string
  thread_ids?: number[]
  profile_events?: Record<string, number>
  settings?: Record<string, string>
}

export interface ProcessListResponse {
  processes: Process[]
  node?: string
}

export interface KillProcessRequest {
  query_id: string
  node?: string
}

export interface KillProcessResponse {
  success: boolean
  message?: string
}

// Retry helper function
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> => {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries')
}

export const queryAPI = {
  getQueryLog: async (filter: QueryLogFilter): Promise<QueryLogResponse> => {
    return retryRequest(async () => {
      const params = new URLSearchParams()
      if (filter.last) params.append('last', filter.last)
      if (filter.from) params.append('from', filter.from)
      if (filter.to) params.append('to', filter.to)
      if (filter.user) params.append('user', filter.user)
      if (filter.node) params.append('node', filter.node)
      if (filter.limit) params.append('limit', filter.limit.toString())
      if (filter.offset) params.append('offset', filter.offset.toString())

      const response = await api.get<QueryLogResponse>(`/query-log?${params.toString()}`)
      return response.data
    })
  },

  getCurrentProcesses: async (node?: string): Promise<ProcessListResponse> => {
    return retryRequest(async () => {
      const params = new URLSearchParams()
      if (node) params.append('node', node)

      const response = await api.get<ProcessListResponse>(`/processes${params.toString() ? `?${params.toString()}` : ''}`)
      return response.data
    })
  },

  streamProcesses: (
    node: string,
    onMessage: (processes: Process[]) => void,
    onError?: (error: Error) => void
  ): EventSource => {
    const token = localStorage.getItem('token')
    const url = `/api/v1/processes/stream?node=${encodeURIComponent(node)}${token ? `&token=${token}` : ''}`
    
    const eventSource = new EventSource(url, {
      withCredentials: false,
    })

    eventSource.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        // Handle connection message
        if (data.status === 'connected') {
          return
        }
      } catch (err) {
        // Ignore parsing errors for connection messages
      }
    })

    eventSource.addEventListener('processes', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        // SSE sends ProcessListResponse or direct array
        if (data && data.processes && Array.isArray(data.processes)) {
          onMessage(data.processes)
        } else if (Array.isArray(data)) {
          onMessage(data)
        }
      } catch (err) {
        if (onError) {
          onError(err as Error)
        }
      }
    })

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (onError) {
          onError(new Error(data.error || 'Unknown error'))
        }
      } catch (err) {
        if (onError) {
          onError(err as Error)
        }
      }
    })

    eventSource.onerror = () => {
      if (onError) {
        onError(new Error('SSE connection error'))
      }
    }

    return eventSource
  },

  killProcess: async (request: KillProcessRequest): Promise<KillProcessResponse> => {
    return retryRequest(async () => {
      const response = await api.post<KillProcessResponse>('/processes/kill', request)
      return response.data
    })
  },

  getQueryLogStats: async (filter: Omit<QueryLogFilter, 'limit' | 'offset'>): Promise<QueryLogStatsResponse> => {
    return retryRequest(async () => {
      const params = new URLSearchParams()
      if (filter.last) params.append('last', filter.last)
      if (filter.from) params.append('from', filter.from)
      if (filter.to) params.append('to', filter.to)
      if (filter.user) params.append('user', filter.user)
      if (filter.node) params.append('node', filter.node)

      const response = await api.get<QueryLogStatsResponse>(`/query-log/stats?${params.toString()}`)
      return response.data
    })
  },
}

