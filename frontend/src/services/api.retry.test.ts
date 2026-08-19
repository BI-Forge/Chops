import { CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { isCanceledError, retryRequest } from './api'

describe('retryRequest', () => {
  it('does not retry a canceled request', async () => {
    let calls = 0
    const canceled = new CanceledError('canceled')

    await expect(
      retryRequest(async () => {
        calls += 1
        throw canceled
      })
    ).rejects.toBe(canceled)

    expect(calls).toBe(1)
    expect(isCanceledError(canceled)).toBe(true)
  })

  it('retries a non-canceled failure then succeeds', async () => {
    let calls = 0
    const networkError = new Error('network')

    const result = await retryRequest(async () => {
      calls += 1
      if (calls < 2) throw networkError
      return 'ok'
    }, 3, 1)

    expect(result).toBe('ok')
    expect(calls).toBe(2)
    expect(isCanceledError(networkError)).toBe(false)
  })
})
