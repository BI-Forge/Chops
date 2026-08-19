import { describe, expect, it } from 'vitest'
import { lastPointValue, seriesToPoints } from './chartSeries'

describe('seriesToPoints', () => {
  it('maps ISO timestamps to epoch ms, sorts by time, and skips invalid dates', () => {
    const earlier = '2026-08-19T10:00:00.000Z'
    const later = '2026-08-19T10:01:00.000Z'
    const points = seriesToPoints(
      [
        { timestamp: later, value: 12.4 },
        { timestamp: 'not-a-date', value: 99 },
        { timestamp: earlier, value: 7.2 },
      ],
      (v) => Math.round(v)
    )

    expect(points).toEqual([
      { t: Date.parse(earlier), v: 7 },
      { t: Date.parse(later), v: 12 },
    ])
  })

  it('skips non-finite values', () => {
    const ts = '2026-08-19T10:00:00.000Z'
    const points = seriesToPoints([
      { timestamp: ts, value: Number.NaN },
      { timestamp: ts, value: Number.POSITIVE_INFINITY },
      { timestamp: ts, value: Number.NEGATIVE_INFINITY },
      { timestamp: ts, value: 4 },
    ])
    expect(points).toEqual([{ t: Date.parse(ts), v: 4 }])
  })

  it('returns an empty array for empty input', () => {
    expect(seriesToPoints([])).toEqual([])
  })

  it('rounds GB values to one decimal', () => {
    const ts = '2026-08-19T10:00:00.000Z'
    const points = seriesToPoints(
      [{ timestamp: ts, value: 12.34 }],
      (v) => Math.round(v * 10) / 10
    )
    expect(points).toEqual([{ t: Date.parse(ts), v: 12.3 }])
  })
})

describe('lastPointValue', () => {
  it('returns 0 for an empty series', () => {
    expect(lastPointValue([])).toBe(0)
  })

  it('returns the last sample', () => {
    const points = seriesToPoints([
      { timestamp: '2026-08-19T10:00:00.000Z', value: 1 },
      { timestamp: '2026-08-19T10:01:00.000Z', value: 9 },
    ])
    expect(lastPointValue(points)).toBe(9)
  })
})
