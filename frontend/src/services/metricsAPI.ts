import api, { retryRequest } from './api'
import type { SystemMetrics, NodesResponse, MetricSeriesResponse, NodeInfo, ServerInfo } from '../types/metrics'

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
    options: {
      period?: string
      step?: string
      from?: string
      to?: string
    }
  ): Promise<MetricSeriesResponse> => {
    return retryRequest(async () => {
      const params: Record<string, string> = {
        node,
        metric,
      }
      if (options.from && options.to) {
        params.from = options.from
        params.to = options.to
      } else {
        if (options.period) params.period = options.period
        if (options.step) params.step = options.step
      }
      const response = await api.get<MetricSeriesResponse>('/clickhouse/metrics/series', {
        params,
        // Caller shows a single chart-level error; avoid 5 duplicate toasts on Promise.all.
        _skipAlert: true,
      } as Parameters<typeof api.get>[1])
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

