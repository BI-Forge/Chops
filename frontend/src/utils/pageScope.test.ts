import { describe, expect, it } from 'vitest'
import { beginPageScope, pageSignal } from './pageScope'

describe('pageScope', () => {
  it('aborts the previous page signal when a new page starts', () => {
    const previous = pageSignal()
    expect(previous.aborted).toBe(false)

    beginPageScope()

    expect(previous.aborted).toBe(true)
    expect(pageSignal().aborted).toBe(false)
    expect(pageSignal()).not.toBe(previous)
  })
})
