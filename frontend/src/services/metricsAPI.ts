import axios from 'axios'
import api, { retryRequest } from './api'
import type {
  SystemMetrics,
  NodesResponse,
  MetricSeriesBatchResponse,
  NodeInfo,
  ServerInfo,
} from '../types/metrics'

export type MetricsStreamErrorSource = 'server' | 'connection'

export interface MetricsNoDataEvent {
  node: string
  error: string
}

// /current and /server-info answer 404 when the node has no snapshot in the last 10 minutes.
export function isNoRecentMetricsError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

// Shared copy for the "no snapshot in the last 10 minutes" state (MetricsCards, ServerInfo).
export const NO_RECENT_DATA_MESSAGE = 'No data from this node in the last 10 minutes'

// Above the backend's max query deadline for series/batch (55s).
const METRIC_SERIES_BATCH_TIMEOUT_MS = 60000

export const metricsAPI = {
  getAvailableNodes: async (): Promise<NodeInfo[]> => {
    return retryRequest(async () => {
      const response = await api.get<NodesResponse>('/clickhouse/metrics/nodes')
      return response.data.nodes
    })
  },

  // Single-shot /current lookup for optional data (e.g. chart axis totals): no retries
  // and no global toast, so a missing recent snapshot (404/500) fails fast and quietly.
  // The caller decides how to degrade.
  getCurrentMetricsQuiet: async (node: string, signal?: AbortSignal): Promise<SystemMetrics> => {
    const response = await api.get<SystemMetrics>('/clickhouse/metrics/current', {
      params: { node },
      signal,
      _skipAlert: true,
      _skipRetry: true,
    } as Parameters<typeof api.get>[1])
    return response.data
  },

  // Opens the SSE metrics stream. Callbacks:
  // - onMessage: a `metrics` event.
  // - onError: a server-reported `error` event or a malformed payload (source 'server';
  //   the stream stays open), or a transport failure (source 'connection').
  // - onNoData: a `no_data` event — the node has no snapshot in the last 10 minutes. Sent
  //   once when the node goes stale; `metrics` events resume on recovery.
  streamMetrics: (
    node: string,
    onMessage: (metrics: SystemMetrics) => void,
    onError?: (error: Error, source: MetricsStreamErrorSource) => void,
    onNoData?: (event: MetricsNoDataEvent) => void
  ): EventSource => {
    const token = localStorage.getItem('token')
    const url = `/api/v1/clickhouse/metrics/stream?node=${encodeURIComponent(node)}${token ? `&token=${token}` : ''}`

    // EventSource doesn't support custom headers, so the token is passed via query parameter.
    const eventSource = new EventSource(url, {
      withCredentials: false,
    })

    eventSource.addEventListener('metrics', (event: MessageEvent) => {
      try {
        onMessage(JSON.parse(event.data))
      } catch (err) {
        onError?.(err as Error, 'server')
      }
    })

    eventSource.addEventListener('no_data', (event: MessageEvent) => {
      if (!onNoData) return
      let payload: Partial<MetricsNoDataEvent> = {}
      try {
        payload = JSON.parse(event.data) ?? {}
      } catch {
        // Malformed payload: the event itself is the signal.
      }
      onNoData({ node: payload.node || node, error: payload.error || '' })
    })

    // A named `error` event from the server and a transport failure are both dispatched as
    // 'error'. Only server events carry data; transport failures are handled by onerror.
    eventSource.addEventListener('error', (event: Event) => {
      if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return
      let message = 'Unknown error'
      try {
        message = JSON.parse(event.data)?.error || message
      } catch {
        // Keep the generic message.
      }
      onError?.(new Error(message), 'server')
    })

    eventSource.onerror = (event: Event) => {
      if (event instanceof MessageEvent && typeof event.data === 'string') return
      onError?.(new Error('SSE connection error'), 'connection')
    }

    return eventSource
  },

  // Fetches several metric series for one node in a single request (one backend scan).
  // Heavy for multi-day ranges: the server allows up to 55s, so the client timeout is
  // raised above that, and the request is NOT retried (neither by retryRequest nor by
  // the response interceptor) to avoid re-running the scan after a timeout.
  getMetricSeriesBatch: async (
    node: string,
    metrics: string[],
    options: {
      period?: string
      step?: string
      from?: string
      to?: string
    },
    signal?: AbortSignal
  ): Promise<MetricSeriesBatchResponse> => {
    const params: Record<string, string> = {
      node,
      metrics: metrics.join(','),
    }
    if (options.from && options.to) {
      params.from = options.from
      params.to = options.to
    } else {
      if (options.period) params.period = options.period
      if (options.step) params.step = options.step
    }
    const response = await api.get<MetricSeriesBatchResponse>('/clickhouse/metrics/series/batch', {
      params,
      signal,
      timeout: METRIC_SERIES_BATCH_TIMEOUT_MS,
      // Caller shows a single chart-level error.
      _skipAlert: true,
      _skipRetry: true,
    } as Parameters<typeof api.get>[1])
    return response.data
  },

  // No retryRequest wrapper and no global toast: a 404 means the node has no recent
  // snapshot, which the panel shows as a state. The interceptor still retries 5xx/network
  // errors; the caller shows a single error alert for those.
  getServerInfo: async (node: string, signal?: AbortSignal): Promise<ServerInfo> => {
    const response = await api.get<ServerInfo>('/clickhouse/metrics/server-info', {
      params: { node },
      signal,
      _skipAlert: true,
    } as Parameters<typeof api.get>[1])
    return response.data
  },
}

