// @vitest-environment jsdom
import { createElement, forwardRef } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MetricSeriesBatchResponse, SystemMetrics } from '../types/metrics'

const showError = vi.fn()

vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }))
vi.mock('../contexts/AlertContext', () => ({ useAlert: () => ({ error: showError }) }))
vi.mock('./TimeRangePicker', () => ({ TimeRangePicker: () => null }))
// echarts needs a canvas; the stub exposes what the chart would be drawn from.
vi.mock('./charts/TimeSeriesChart', () => ({
  TimeSeriesChart: forwardRef(
    (props: { seriesName: string; points: unknown[]; yMax?: number }, _ref) =>
      createElement('figure', {
        'aria-label': `${props.seriesName} chart`,
        'data-points': String(props.points.length),
        'data-ymax': props.yMax === undefined ? 'auto' : String(props.yMax),
      })
  ),
}))
vi.mock('../services/metricsAPI', () => ({
  metricsAPI: {
    getCurrentMetricsQuiet: vi.fn(),
    getMetricSeriesBatch: vi.fn(),
  },
}))

const { metricsAPI } = await import('../services/metricsAPI')
const { SystemCharts } = await import('./SystemCharts')

const getCurrent = vi.mocked(metricsAPI.getCurrentMetricsQuiet)
const getBatch = vi.mocked(metricsAPI.getMetricSeriesBatch)

const CHART_METRICS = ['cpu_load', 'memory_load', 'memory_used_gb', 'storage_used', 'active_queries']

// Each metric gets a distinct number of points so a wrong metric→chart mapping is visible.
function batchResponse(node = 'n1'): MetricSeriesBatchResponse {
  const pts = (...values: number[]) =>
    values.map((value, i) => ({ timestamp: `2026-01-01T0${i}:00:00Z`, value }))
  return {
    node,
    metrics: CHART_METRICS,
    period: '1d',
    step: '30m',
    from: '2026-01-01T00:00:00Z',
    to: '2026-01-02T00:00:00Z',
    series: {
      cpu_load: pts(10),
      memory_load: pts(40, 50),
      memory_used_gb: pts(3.2, 3.4, 3.6),
      storage_used: pts(120, 121, 122, 123),
      active_queries: pts(1, 2, 3, 4, 5),
    },
  }
}

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError(`status ${status}`, 'ERR_BAD_RESPONSE', config, null, {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  })
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const chart = (name: string) => screen.getByLabelText(`${name} chart`)
const flush = () => act(async () => {})

beforeEach(() => {
  sessionStorage.clear()
  showError.mockReset()
  getCurrent.mockReset()
  getBatch.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SystemCharts', () => {
  it('loads every chart with one batch request issued in parallel with the totals lookup', async () => {
    const totals = deferred<SystemMetrics>()
    getCurrent.mockReturnValue(totals.promise)
    getBatch.mockResolvedValue(batchResponse())

    render(createElement(SystemCharts, { selectedNode: 'n1' }))

    // The batch is requested before /current has answered.
    expect(getBatch).toHaveBeenCalledTimes(1)
    const [node, metrics, opts, signal] = getBatch.mock.calls[0]
    expect(node).toBe('n1')
    expect(metrics).toEqual(CHART_METRICS)
    expect(opts).toEqual({ period: '1d', step: '30m' })
    expect(signal).toBeInstanceOf(AbortSignal)

    totals.resolve({ memory_total_gb: 15.6, disk_total_gb: 499.6 } as SystemMetrics)
    await flush()

    expect(chart('CPU').getAttribute('data-points')).toBe('1')
    // The Memory chart plots memory_used_gb (GB); memory_load (%) is only the secondary value.
    expect(chart('Memory').getAttribute('data-points')).toBe('3')
    expect(chart('Storage').getAttribute('data-points')).toBe('4')
    expect(chart('Queries').getAttribute('data-points')).toBe('5')
    expect(chart('Memory').getAttribute('data-ymax')).toBe('16')
    expect(chart('Storage').getAttribute('data-ymax')).toBe('500')
    expect(showError).not.toHaveBeenCalled()
  })

  it('still draws the charts when the totals lookup fails (no recent snapshot)', async () => {
    getCurrent.mockRejectedValue(httpError(404, { error: 'node n1: no metrics in the last 10 minutes' }))
    getBatch.mockResolvedValue(batchResponse())

    render(createElement(SystemCharts, { selectedNode: 'n1' }))
    await flush()

    expect(chart('CPU').getAttribute('data-points')).toBe('1')
    // Default axis limits are kept.
    expect(chart('Memory').getAttribute('data-ymax')).toBe('auto')
    expect(chart('Storage').getAttribute('data-ymax')).toBe('1000')
    expect(showError).not.toHaveBeenCalled()
  })

  it('shows one chart-level error with the server message when the batch fails', async () => {
    getCurrent.mockResolvedValue({ memory_total_gb: 8, disk_total_gb: 100 } as SystemMetrics)
    getBatch.mockRejectedValue(httpError(500, { error: 'failed to load metric series' }))

    render(createElement(SystemCharts, { selectedNode: 'n1' }))
    await flush()

    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Failed to load charts', 'failed to load metric series', 5000)
    expect(chart('CPU').getAttribute('data-points')).toBe('0')
    // Totals still applied.
    expect(chart('Memory').getAttribute('data-ymax')).toBe('8')
  })

  it('sends from/to for a stored absolute range', async () => {
    sessionStorage.setItem(
      'dashboardTimeRange',
      JSON.stringify({ kind: 'absolute', from: '2026-01-01T00:00', to: '2026-01-01T06:00' })
    )
    getCurrent.mockResolvedValue({ memory_total_gb: 8, disk_total_gb: 100 } as SystemMetrics)
    getBatch.mockResolvedValue(batchResponse())

    render(createElement(SystemCharts, { selectedNode: 'n1' }))
    await flush()

    expect(getBatch).toHaveBeenCalledTimes(1)
    const opts = getBatch.mock.calls[0][2]
    expect(opts.period).toBeUndefined()
    expect(opts.from).toBeTruthy()
    expect(opts.to).toBeTruthy()
  })

  it('aborts the in-flight requests on unmount and on node change', async () => {
    getCurrent.mockReturnValue(new Promise(() => {}))
    getBatch.mockReturnValue(new Promise(() => {}))

    const { rerender, unmount } = render(createElement(SystemCharts, { selectedNode: 'n1' }))
    const firstSignal = getBatch.mock.calls[0][3] as AbortSignal
    expect(getCurrent.mock.calls[0][1]).toBe(firstSignal)
    expect(firstSignal.aborted).toBe(false)

    rerender(createElement(SystemCharts, { selectedNode: 'n2' }))
    await flush()
    expect(firstSignal.aborted).toBe(true)
    expect(getBatch.mock.calls[getBatch.mock.calls.length - 1][0]).toBe('n2')

    const lastSignal = getBatch.mock.calls[getBatch.mock.calls.length - 1][3] as AbortSignal
    unmount()
    expect(lastSignal.aborted).toBe(true)
  })

  it('ignores a late result for the previous node and does not keep its axis limits', async () => {
    const n1Totals = deferred<SystemMetrics>()
    const n1Batch = deferred<MetricSeriesBatchResponse>()
    // n1 already showed its totals once (first load), then a slow refresh is in flight.
    getCurrent.mockResolvedValueOnce({ memory_total_gb: 64, disk_total_gb: 4000 } as SystemMetrics)
    getBatch.mockResolvedValueOnce(batchResponse('n1'))

    const { rerender } = render(createElement(SystemCharts, { selectedNode: 'n1' }))
    await flush()
    expect(chart('Memory').getAttribute('data-ymax')).toBe('64')

    getCurrent.mockReturnValueOnce(n1Totals.promise)
    getBatch.mockReturnValueOnce(n1Batch.promise)
    await act(async () => {
      screen.getByRole('button', { name: /refresh/i }).click()
    })

    // n2: its own (smaller) series; no recent snapshot, so totals fail.
    const n2: MetricSeriesBatchResponse = {
      ...batchResponse('n2'),
      series: {
        cpu_load: [{ timestamp: '2026-01-01T00:00:00Z', value: 1 }],
        memory_load: [],
        memory_used_gb: [],
        storage_used: [],
        active_queries: [{ timestamp: '2026-01-01T00:00:00Z', value: 1 }, { timestamp: '2026-01-01T01:00:00Z', value: 2 }],
      },
    }
    getCurrent.mockRejectedValueOnce(httpError(404, { error: 'node n2: no metrics in the last 10 minutes' }))
    getBatch.mockResolvedValueOnce(n2)
    rerender(createElement(SystemCharts, { selectedNode: 'n2' }))
    await flush()

    // The superseded n1 refresh resolves last.
    n1Totals.resolve({ memory_total_gb: 128, disk_total_gb: 9000 } as SystemMetrics)
    n1Batch.resolve(batchResponse('n1'))
    await flush()

    expect(chart('CPU').getAttribute('data-points')).toBe('1')
    expect(chart('Memory').getAttribute('data-points')).toBe('0')
    expect(chart('Storage').getAttribute('data-points')).toBe('0')
    expect(chart('Queries').getAttribute('data-points')).toBe('2')
    expect(chart('Memory').getAttribute('data-ymax')).toBe('auto')
    expect(chart('Storage').getAttribute('data-ymax')).toBe('1000')
  })
})
