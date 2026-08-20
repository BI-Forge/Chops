import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanceledError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import api from './api'
import { pageSignal } from '../utils/pageScope'
import { alertUtils } from '../utils/alertUtils'

const originalAdapter = api.defaults.adapter

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  })
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function okAdapter(): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
}

describe('api interceptors', () => {
  it('attaches the page signal to non-auth requests', async () => {
    api.defaults.adapter = okAdapter()
    const res = await api.get('/clickhouse/metrics/nodes')
    expect(res.config.signal).toBe(pageSignal())
  })

  it('does not attach the page signal to /auth/login or /auth/me', async () => {
    api.defaults.adapter = okAdapter()
    const login = await api.post('/auth/login', { username: 'a', password: 'b' })
    const me = await api.get('/auth/me')
    expect(login.config.signal).toBeUndefined()
    expect(me.config.signal).toBeUndefined()
  })

  it('rejects a canceled request once without an error alert', async () => {
    let calls = 0
    api.defaults.adapter = async () => {
      calls += 1
      throw new CanceledError('canceled')
    }
    const errorSpy = vi.spyOn(alertUtils, 'error')

    await expect(api.get('/clickhouse/metrics/nodes')).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    })

    expect(calls).toBe(1)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
