// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerInfo as ServerInfoType } from '../types/metrics'

const showError = vi.fn()

vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }))
vi.mock('../contexts/AlertContext', () => ({ useAlert: () => ({ error: showError }) }))
vi.mock('../services/metricsAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/metricsAPI')>()
  return { ...actual, metricsAPI: { ...actual.metricsAPI, getServerInfo: vi.fn() } }
})

const { metricsAPI, NO_RECENT_DATA_MESSAGE } = await import('../services/metricsAPI')
const { ServerInfo } = await import('./ServerInfo')

const getServerInfo = vi.mocked(metricsAPI.getServerInfo)

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

const noRecent = () =>
  httpError(404, { error: 'No recent metrics', message: 'node n1: no metrics in the last 10 minutes' })

const info: ServerInfoType = {
  node_name: 'n1',
  uptime: 3600,
  version_integer: 25010006,
  total_memory: 8 * 1024 ** 3,
  total_storage: '100 GB',
  unreserved_storage: '90 GB',
  available_storage: '80 GB',
  host: 'ch1',
  cluster: 'c1',
} as ServerInfoType

async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const statusText = () => screen.getByRole('status').textContent

beforeEach(() => {
  vi.useFakeTimers()
  showError.mockReset()
  getServerInfo.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ServerInfo', () => {
  it('shows "No recent data" on a 404 without an alert and re-polls quietly every 30s until data returns', async () => {
    getServerInfo.mockRejectedValueOnce(noRecent()).mockRejectedValueOnce(noRecent()).mockResolvedValueOnce(info)

    render(createElement(ServerInfo, { selectedNode: 'n1' }))
    await advance()

    expect(statusText()).toContain('No recent data')
    expect(statusText()).not.toContain('Offline')
    expect(screen.getAllByText(NO_RECENT_DATA_MESSAGE).length).toBeGreaterThan(0)
    expect(screen.queryByText('Unavailable')).toBeNull()
    expect(getServerInfo).toHaveBeenCalledTimes(1)

    await advance(29999)
    expect(getServerInfo).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(getServerInfo).toHaveBeenCalledTimes(2)
    // Still stale: state kept, no alert, next poll scheduled.
    expect(statusText()).toContain('No recent data')

    await advance(30000)
    expect(getServerInfo).toHaveBeenCalledTimes(3)
    expect(statusText()).toContain('Online')
    expect(screen.queryByText(NO_RECENT_DATA_MESSAGE)).toBeNull()
    expect(showError).not.toHaveBeenCalled()

    // Polling stops once data is back.
    await advance(120000)
    expect(getServerInfo).toHaveBeenCalledTimes(3)
  })

  it('keeps showing "No recent data" (no loading state) while a quiet re-poll is in flight', async () => {
    let rejectPoll!: (e: unknown) => void
    getServerInfo
      .mockRejectedValueOnce(noRecent())
      .mockReturnValueOnce(new Promise<ServerInfoType>((_resolve, reject) => (rejectPoll = reject)))

    render(createElement(ServerInfo, { selectedNode: 'n1' }))
    await advance()
    await advance(30000)

    expect(getServerInfo).toHaveBeenCalledTimes(2)
    expect(statusText()).toContain('No recent data')
    expect(statusText()).not.toContain('Checking')

    await act(async () => rejectPoll(noRecent()))
    expect(statusText()).toContain('No recent data')
    expect(showError).not.toHaveBeenCalled()
  })

  it('keeps polling quietly when a re-poll fails with a server error', async () => {
    getServerInfo.mockRejectedValueOnce(noRecent()).mockRejectedValueOnce(httpError(500, { error: 'boom' }))

    render(createElement(ServerInfo, { selectedNode: 'n1' }))
    await advance()
    await advance(30000)

    expect(getServerInfo).toHaveBeenCalledTimes(2)
    expect(showError).not.toHaveBeenCalled()
    expect(statusText()).toContain('No recent data')
    getServerInfo.mockResolvedValue(info)
    await advance(30000)
    expect(statusText()).toContain('Online')
  })

  it('reports a server error once with the server message and does not poll', async () => {
    getServerInfo.mockRejectedValue(
      httpError(500, { error: 'Failed to get server info', message: 'node n9 not found in config' })
    )

    render(createElement(ServerInfo, { selectedNode: 'n9' }))
    await advance()

    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Failed to load server info', 'node n9 not found in config', 5000)
    expect(statusText()).toContain('Offline')

    await advance(120000)
    expect(getServerInfo).toHaveBeenCalledTimes(1)
  })

  it('stops polling when the node changes', async () => {
    getServerInfo.mockRejectedValueOnce(noRecent()).mockResolvedValue({ ...info, node_name: 'n2' })

    const { rerender } = render(createElement(ServerInfo, { selectedNode: 'n1' }))
    await advance()
    rerender(createElement(ServerInfo, { selectedNode: 'n2' }))
    await advance()
    expect(statusText()).toContain('Online')

    await advance(120000)
    expect(getServerInfo.mock.calls.map((c) => c[0])).toEqual(['n1', 'n2'])
  })
})
