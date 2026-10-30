// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SystemMetrics } from '../types/metrics'
import type { MetricsNoDataEvent, MetricsStreamErrorSource } from '../services/metricsAPI'

const showError = vi.fn()

vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }))
// Stable reference: showError is an effect dependency of MetricsCards.
vi.mock('../contexts/AlertContext', () => ({ useAlert: () => ({ error: showError }) }))

interface StreamHandle {
  node: string
  onMessage: (m: SystemMetrics) => void
  onError: (e: Error, source: MetricsStreamErrorSource) => void
  onNoData: (e: MetricsNoDataEvent) => void
  close: ReturnType<typeof vi.fn>
}
const streams: StreamHandle[] = []

vi.mock('../services/metricsAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/metricsAPI')>()
  return {
    ...actual,
    metricsAPI: {
      ...actual.metricsAPI,
      getCurrentMetricsQuiet: vi.fn(),
      streamMetrics: vi.fn(
        (
          node: string,
          onMessage: StreamHandle['onMessage'],
          onError: StreamHandle['onError'],
          onNoData: StreamHandle['onNoData']
        ) => {
          const handle = { node, onMessage, onError, onNoData, close: vi.fn() }
          streams.push(handle)
          return { close: handle.close }
        }
      ),
    },
  }
})

const { metricsAPI, NO_RECENT_DATA_MESSAGE } = await import('../services/metricsAPI')
const { MetricsCards } = await import('./MetricsCards')

const getCurrent = vi.mocked(metricsAPI.getCurrentMetricsQuiet)

function sampleMetrics(cpu: number): SystemMetrics {
  return {
    node_name: 'n1',
    timestamp: '2026-01-01T00:00:00Z',
    cpu_load: cpu,
    memory_usage: 50,
    memory_used_gb: 4,
    memory_total_gb: 8,
    disk_usage: 10,
    disk_used_gb: 100,
    disk_total_gb: 1000,
    active_conns: 3,
    active_queries: 2,
  } as SystemMetrics
}

function notFound(): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', config, null, {
    data: { error: 'node n1: no metrics in the last 10 minutes' },
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config,
  })
}

// Runs pending timers up to `ms` and lets resolved promises/effects settle.
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const latestStream = () => streams[streams.length - 1]
const noRecentState = () => screen.queryByText(NO_RECENT_DATA_MESSAGE)
const cpuValue = (value: number) => screen.queryByText(String(value), { selector: 'span' })

beforeEach(() => {
  vi.useFakeTimers()
  streams.length = 0
  showError.mockReset()
  getCurrent.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MetricsCards', () => {
  it('shows the no-recent state on a /current 404 without an alert, and recovers on stream metrics', async () => {
    getCurrent.mockRejectedValue(notFound())

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()

    expect(noRecentState()).not.toBeNull()
    expect(screen.getByRole('status').textContent).toBe(NO_RECENT_DATA_MESSAGE)
    expect(showError).not.toHaveBeenCalled()
    // The stream is opened anyway so the cards recover by themselves.
    expect(streams).toHaveLength(1)
    expect(latestStream().node).toBe('n1')

    await act(async () => latestStream().onMessage(sampleMetrics(37)))

    expect(noRecentState()).toBeNull()
    expect(screen.getByText('CPU Load')).not.toBeNull()
    expect(cpuValue(37)).not.toBeNull()
  })

  it('switches to the no-recent state on a `no_data` stream event and back on `metrics`', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(12))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()
    expect(cpuValue(12)).not.toBeNull()

    await act(async () => latestStream().onNoData({ node: 'n1', error: 'node n1: no metrics in the last 10 minutes' }))

    expect(noRecentState()).not.toBeNull()
    expect(screen.queryByText('CPU Load')).toBeNull()
    expect(showError).not.toHaveBeenCalled()

    await act(async () => latestStream().onMessage(sampleMetrics(64)))

    expect(noRecentState()).toBeNull()
    expect(cpuValue(64)).not.toBeNull()
  })

  it('alerts once per outage and backs off reconnects (5s, 10s, then reset after recovery)', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()
    expect(streams).toHaveLength(1)

    // Outage 1, failure 1: alert, close, reconnect after 5s.
    await act(async () => streams[0].onError(new Error('SSE connection error'), 'connection'))
    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Connection Error', 'Lost connection to metrics stream. Reconnecting...', 5000)
    expect(streams[0].close).toHaveBeenCalled()

    await advance(4999)
    expect(streams).toHaveLength(1)
    await advance(1)
    expect(getCurrent).toHaveBeenCalledTimes(2)
    expect(streams).toHaveLength(2)

    // Failure 2 in the same outage: no new alert, next delay doubles to 10s.
    await act(async () => streams[1].onError(new Error('SSE connection error'), 'connection'))
    expect(showError).toHaveBeenCalledTimes(1)
    await advance(9999)
    expect(streams).toHaveLength(2)
    await advance(1)
    expect(streams).toHaveLength(3)

    // Recovery via a stream event ends the outage.
    await act(async () => streams[2].onMessage(sampleMetrics(21)))

    // Outage 2: a new alert, and the backoff starts again at 5s.
    await act(async () => streams[2].onError(new Error('SSE connection error'), 'connection'))
    expect(showError).toHaveBeenCalledTimes(2)
    await advance(5000)
    expect(streams).toHaveLength(4)
  })

  it('doubles the reconnect delay up to a 60s cap while the outage lasts', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()

    for (const delay of [5000, 10000, 20000, 40000, 60000, 60000]) {
      const before = streams.length
      await act(async () => latestStream().onError(new Error('SSE connection error'), 'connection'))
      await advance(delay - 1)
      expect(streams, `reconnect must not happen before ${delay}ms`).toHaveLength(before)
      await advance(1)
      expect(streams, `reconnect expected after ${delay}ms`).toHaveLength(before + 1)
    }
    expect(showError).toHaveBeenCalledTimes(1)
  })

  it('ends the outage on a `no_data` stream event: next failure alerts again and backs off from 5s', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()

    // Outage 1 with two failures: delay grows to 10s.
    await act(async () => streams[0].onError(new Error('SSE connection error'), 'connection'))
    await advance(5000)
    await act(async () => streams[1].onError(new Error('SSE connection error'), 'connection'))
    await advance(10000)
    expect(streams).toHaveLength(3)
    expect(showError).toHaveBeenCalledTimes(1)

    // The stream works again, reporting the no-recent state.
    await act(async () => streams[2].onNoData({ node: 'n1', error: 'node n1: no metrics in the last 10 minutes' }))

    await act(async () => streams[2].onError(new Error('SSE connection error'), 'connection'))
    expect(showError).toHaveBeenCalledTimes(2)
    await advance(4999)
    expect(streams).toHaveLength(3)
    await advance(1)
    expect(streams).toHaveLength(4)
  })

  it('switches the stream to the new node and clears the no-recent state', async () => {
    getCurrent.mockImplementation(async (node: string) => {
      if (node === 'n1') throw notFound()
      return sampleMetrics(55)
    })

    const { rerender } = render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()
    expect(noRecentState()).not.toBeNull()

    rerender(createElement(MetricsCards, { selectedNode: 'n2' }))
    await advance()

    expect(streams[0].close).toHaveBeenCalled()
    expect(latestStream().node).toBe('n2')
    expect(noRecentState()).toBeNull()
    expect(cpuValue(55)).not.toBeNull()
  })

  it('does not reset the outage on a successful /current alone', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()

    await act(async () => streams[0].onError(new Error('SSE connection error'), 'connection'))
    await advance(5000) // reconnect: /current succeeds, stream reopened
    expect(streams).toHaveLength(2)
    await act(async () => streams[1].onError(new Error('SSE connection error'), 'connection'))

    expect(showError).toHaveBeenCalledTimes(1)
  })

  it('keeps the stream open on a server-reported error and alerts once', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()

    await act(async () => streams[0].onError(new Error('Failed to get metrics: boom'), 'server'))
    await act(async () => streams[0].onError(new Error('Failed to get metrics: boom'), 'server'))
    await advance(60000)

    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Metrics stream error', 'Failed to get metrics: boom', 5000)
    expect(streams[0].close).not.toHaveBeenCalled()
    expect(streams).toHaveLength(1)
    expect(cpuValue(20)).not.toBeNull()
  })

  it('closes the stream and cancels a pending reconnect on unmount', async () => {
    getCurrent.mockResolvedValue(sampleMetrics(20))

    const { unmount } = render(createElement(MetricsCards, { selectedNode: 'n1' }))
    await advance()
    await act(async () => streams[0].onError(new Error('SSE connection error'), 'connection'))

    unmount()
    await advance(60000)

    expect(streams).toHaveLength(1)
    expect(getCurrent).toHaveBeenCalledTimes(1)
  })
})
