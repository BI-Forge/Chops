import api from './api'
import type { SystemMetrics, NodesResponse } from '../types/metrics'

export const metricsAPI = {
  getAvailableNodes: async (): Promise<string[]> => {
    const response = await api.get<NodesResponse>('/metrics/nodes')
    return response.data.nodes
  },

  getCurrentMetrics: async (node: string): Promise<SystemMetrics> => {
    const response = await api.get<SystemMetrics>('/metrics/current', {
      params: { node },
    })
    return response.data
  },

  streamMetrics: (node: string, onMessage: (metrics: SystemMetrics) => void, onError?: (error: Error) => void): EventSource => {
    const token = localStorage.getItem('token')
    const url = `/api/v1/metrics/stream?node=${encodeURIComponent(node)}${token ? `&token=${token}` : ''}`
    
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
}

