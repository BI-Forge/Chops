import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import api from './api'
import { alertUtils } from '../utils/alertUtils'
import { isNoRecentMetricsError, metricsAPI } from './metricsAPI'

type CapturedConfig = InternalAxiosRequestConfig & { _skipAlert?: boolean; _skipRetry?: boolean }

const originalAdapter = api.defaults.adapter

let token: string | null = null

beforeEach(() => {
  token = null
  vi.stubGlobal('localStorage', {
    getItem: () => token,
    setItem: () => {},
    removeItem: () => {},
  })
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown = {}): AxiosError {
  const response: AxiosResponse = {
    data,
    status,
    statusText: `HTTP ${status}`,
    headers: {},
    config,
  }
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response)
}

// Records every request the client sends and answers with `respond`.
function recordingAdapter(respond: (config: CapturedConfig) => Promise<AxiosResponse>) {
  const calls: CapturedConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config as CapturedConfig)
    return respond(config as CapturedConfig)
  }
  api.defaults.adapter = adapter
  return calls
}

const ok = (data: unknown) => async (config: CapturedConfig): Promise<AxiosResponse> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

const batchBody = {
  node: 'n1',
  metrics: ['cpu_load', 'active_queries'],
  period: '1h',
  step: '1m',
  from: '2026-01-01T00:00:00Z',
  to: '2026-01-01T01:00:00Z',
  series: { cpu_load: [{ timestamp: '2026-01-01T00:00:00Z', value: 12 }], active_queries: [] },
}

describe('metricsAPI.getMetricSeriesBatch', () => {
  it('requests all metrics in one call with period/step, a 60s timeout and no retry/alert', async () => {
    const calls = recordingAdapter(ok(batchBody))
    const controller = new AbortController()

    const result = await metricsAPI.getMetricSeriesBatch(
      'n1',
      ['cpu_load', 'active_queries'],
      { period: '1h', step: '1m' },
      controller.signal
    )

    expect(result).toEqual(batchBody)
    expect(calls).toHaveLength(1)
    const [config] = calls
    expect(config.url).toBe('/clickhouse/metrics/series/batch')
    expect(config.params).toEqual({ node: 'n1', metrics: 'cpu_load,active_queries', period: '1h', step: '1m' })
    expect(config.timeout).toBe(60000)
    expect(config._skipRetry).toBe(true)
    expect(config._skipAlert).toBe(true)
    expect(config.signal).toBe(controller.signal)
  })

  it('sends from/to instead of period/step for an absolute range', async () => {
    const calls = recordingAdapter(ok(batchBody))

    await metricsAPI.getMetricSeriesBatch('n1', ['cpu_load'], {
      period: '1h',
      step: '1m',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-01T06:00:00Z',
    })

    expect(calls[0].params).toEqual({
      node: 'n1',
      metrics: 'cpu_load',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-01T06:00:00Z',
    })
  })

  it('does not retry or alert on a 5xx response', async () => {
    const calls = recordingAdapter(async (config) => {
      throw httpError(config, 503, { error: 'failed to load metric series' })
    })
    const alertSpy = vi.spyOn(alertUtils, 'error')

    await expect(
      metricsAPI.getMetricSeriesBatch('n1', ['cpu_load'], { period: '7d', step: '1h' })
    ).rejects.toMatchObject({ response: { status: 503 } })

    expect(calls).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('does not retry or alert on a client timeout', async () => {
    const calls = recordingAdapter(async (config) => {
      throw new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)
    })
    const alertSpy = vi.spyOn(alertUtils, 'error')

    await expect(
      metricsAPI.getMetricSeriesBatch('n1', ['cpu_load'], { period: '7d', step: '1h' })
    ).rejects.toMatchObject({ code: 'ECONNABORTED' })

    expect(calls).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
  })
})

describe('metricsAPI.getCurrentMetricsQuiet', () => {
  it('rejects a 404 once, quietly, as a no-recent-metrics error', async () => {
    const calls = recordingAdapter(async (config) => {
      throw httpError(config, 404, { error: 'node n1: no metrics in the last 10 minutes' })
    })
    const alertSpy = vi.spyOn(alertUtils, 'error')

    const error = await metricsAPI.getCurrentMetricsQuiet('n1').catch((e: unknown) => e)

    expect(isNoRecentMetricsError(error)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].params).toEqual({ node: 'n1' })
    expect(calls[0]._skipRetry).toBe(true)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('does not retry a 5xx', async () => {
    const calls = recordingAdapter(async (config) => {
      throw httpError(config, 500)
    })

    const error = await metricsAPI.getCurrentMetricsQuiet('n1').catch((e: unknown) => e)

    expect(isNoRecentMetricsError(error)).toBe(false)
    expect(calls).toHaveLength(1)
  })
})

describe('metricsAPI.getServerInfo', () => {
  it('rejects a 404 once without a global alert', async () => {
    const calls = recordingAdapter(async (config) => {
      throw httpError(config, 404, { error: 'No recent metrics', message: 'node n1: no metrics in the last 10 minutes' })
    })
    const alertSpy = vi.spyOn(alertUtils, 'error')

    const error = await metricsAPI.getServerInfo('n1').catch((e: unknown) => e)

    expect(isNoRecentMetricsError(error)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
  })
})

describe('isNoRecentMetricsError', () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig

  it.each([
    ['axios 404', httpError(config, 404), true],
    ['axios 500', httpError(config, 500), false],
    ['axios 400', httpError(config, 400), false],
    ['network error without response', new AxiosError('Network Error', 'ERR_NETWORK', config), false],
    ['canceled request', new CanceledError('canceled'), false],
    ['non-axios object shaped like a 404', { response: { status: 404 } }, false],
    ['plain Error', new Error('404'), false],
    ['undefined', undefined, false],
  ])('%s → %s', (_name, error, expected) => {
    expect(isNoRecentMetricsError(error)).toBe(expected)
  })
})

// Minimal EventSource stand-in: like the browser, an event of type "error" is
// delivered both to addEventListener('error') listeners and to onerror.
class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = []
  onerror: ((event: Event) => void) | null = null
  closed = false

  constructor(
    public url: string,
    public init?: EventSourceInit
  ) {
    super()
    FakeEventSource.instances.push(this)
  }

  close() {
    this.closed = true
  }

  emit(event: Event) {
    this.dispatchEvent(event)
    if (event.type === 'error') this.onerror?.(event)
  }

  emitMessage(type: string, data: string) {
    this.emit(new MessageEvent(type, { data }))
  }
}

describe('metricsAPI.streamMetrics', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  function open() {
    const onMessage = vi.fn()
    const onError = vi.fn()
    const onNoData = vi.fn()
    metricsAPI.streamMetrics('node a', onMessage, onError, onNoData)
    const source = FakeEventSource.instances[0]
    return { source, onMessage, onError, onNoData }
  }

  it('opens the stream for the encoded node with the token in the query', () => {
    token = 'jwt-123'
    const { source } = open()

    expect(source.url).toBe('/api/v1/clickhouse/metrics/stream?node=node%20a&token=jwt-123')
  })

  it('delivers parsed `metrics` events to onMessage', () => {
    const { source, onMessage, onError } = open()

    source.emitMessage('metrics', JSON.stringify({ node_name: 'node a', cpu_load: 42 }))

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage).toHaveBeenCalledWith({ node_name: 'node a', cpu_load: 42 })
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a malformed `metrics` payload as a server error', () => {
    const { source, onMessage, onError } = open()

    source.emitMessage('metrics', '{not json')

    expect(onMessage).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][1]).toBe('server')
  })

  it('dispatches `no_data` to onNoData and not to onError', () => {
    const { source, onNoData, onError, onMessage } = open()

    source.emitMessage('no_data', JSON.stringify({ node: 'node a', error: 'node node a: no metrics in the last 10 minutes' }))

    expect(onNoData).toHaveBeenCalledTimes(1)
    expect(onNoData).toHaveBeenCalledWith({
      node: 'node a',
      error: 'node node a: no metrics in the last 10 minutes',
    })
    expect(onError).not.toHaveBeenCalled()
    expect(onMessage).not.toHaveBeenCalled()
  })

  it('still signals `no_data` when its payload is malformed', () => {
    const { source, onNoData } = open()

    source.emitMessage('no_data', 'garbage')

    expect(onNoData).toHaveBeenCalledTimes(1)
    expect(onNoData).toHaveBeenCalledWith({ node: 'node a', error: '' })
  })

  it('reports a server `error` event once, with its message, as source "server"', () => {
    const { source, onError } = open()

    source.emitMessage('error', JSON.stringify({ error: 'Failed to get metrics: boom' }))

    expect(onError).toHaveBeenCalledTimes(1)
    const [error, kind] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Failed to get metrics: boom')
    expect(kind).toBe('server')
  })

  it('reports a transport failure once as source "connection"', () => {
    const { source, onError } = open()

    source.emit(new Event('error'))

    expect(onError).toHaveBeenCalledTimes(1)
    const [error, kind] = onError.mock.calls[0]
    expect((error as Error).message).toBe('SSE connection error')
    expect(kind).toBe('connection')
  })
})
