import api from './api'
import type { SystemMetrics, NodesResponse, MetricSeriesResponse, NodeInfo, ServerInfo } from '../types/metrics'

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
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries')
}

export const metricsAPI = {
  getAvailableNodes: async (): Promise<NodeInfo[]> => {
    return retryRequest(async () => {
      const response = await api.get<NodesResponse>('/clickhouse/metrics/nodes')
      return response.data.nodes
    })
  },

  getCurrentMetrics: async (node: string): Promise<SystemMetrics> => {
    return retryRequest(async () => {
      const response = await api.get<SystemMetrics>('/clickhouse/metrics/current', {
        params: { node },
      })
      return response.data
    })
  },

  streamMetrics: (node: string, onMessage: (metrics: SystemMetrics) => void, onError?: (error: Error) => void): EventSource => {
    const token = localStorage.getItem('token')
    const url = `/api/v1/clickhouse/metrics/stream?node=${encodeURIComponent(node)}${token ? `&token=${token}` : ''}`
    
    const eventSource = new EventSource(url, {
      withCredentials: false,
    })

    // Since EventSource doesn't support custom headers, token is passed via query parameter
    
    eventSource.onmessage = (event) => {
      try {
        if (event.type === 'metrics') {
          const data = JSON.parse(event.data)
          onMessage(data)
        } else if (event.type === 'error') {
          const errorData = JSON.parse(event.data)
          if (onError) {
            onError(new Error(errorData.error || 'Unknown error'))
          }
        }
      } catch (err) {
        if (onError) {
          onError(err as Error)
        }
      }
    }

    eventSource.addEventListener('metrics', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
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

  getMetricSeries: async (
    node: string,
    metric: string,
    period: string,
    step: string
  ): Promise<MetricSeriesResponse> => {
    return retryRequest(async () => {
      const response = await api.get<MetricSeriesResponse>('/clickhouse/metrics/series', {
        params: {
          node,
          metric,
          period,
          step,
        },
      })
      return response.data
    })
  },

  getServerInfo: async (node: string): Promise<ServerInfo> => {
    return retryRequest(async () => {
      const response = await api.get<ServerInfo>('/clickhouse/metrics/server-info', {
        params: { node },
      })
      return response.data
    })
  },
}

