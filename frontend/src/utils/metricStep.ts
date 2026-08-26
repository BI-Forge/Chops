export type TimeRangeValue =
  | { kind: 'relative'; period: string }
  | { kind: 'absolute'; from: string; to: string }

/** Chart period presets and step ladder (mirrors backend stepForDuration). */

export const PERIOD_CONFIGURATIONS: Record<
  string,
  { apiPeriod: string; step: string; displayStep: string; label: string }
> = {
  '10m': { apiPeriod: '10m', step: '1s', displayStep: '1s', label: 'Last 10 Minutes' },
  '30m': { apiPeriod: '30m', step: '10s', displayStep: '10s', label: 'Last 30 Minutes' },
  '1h': { apiPeriod: '1h', step: '1m', displayStep: '1m', label: 'Last 1 Hour' },
  '6h': { apiPeriod: '6h', step: '5m', displayStep: '5m', label: 'Last 6 Hours' },
  '12h': { apiPeriod: '12h', step: '5m', displayStep: '5m', label: 'Last 12 Hours' },
  '1d': { apiPeriod: '1d', step: '30m', displayStep: '30m', label: 'Last 24 Hours' },
  '3d': { apiPeriod: '3d', step: '1h', displayStep: '1h', label: 'Last 3 Days' },
  '7d': { apiPeriod: '7d', step: '1h', displayStep: '1h', label: 'Last 7 Days' },
}

/** Max chart buckets for absolute from/to (mirrors backend maxMetricSeriesPoints). */
export const MAX_METRIC_SERIES_POINTS = 2500

const STEP_MS: Record<string, number> = {
  '1s': 1000,
  '10s': 10_000,
  '1m': 60_000,
  '5m': 5 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
}

const MS = {
  m10: 10 * 60 * 1000,
  m30: 30 * 60 * 1000,
  h1: 60 * 60 * 1000,
  h6: 6 * 60 * 60 * 1000,
  h12: 12 * 60 * 60 * 1000,
  d1: 24 * 60 * 60 * 1000,
} as const

/** Display-only step from absolute range length (server remains source of truth). */
export function stepForDurationMs(durationMs: number): string {
  if (durationMs <= 0) return '1s'
  if (durationMs <= MS.m10) return '1s'
  if (durationMs <= MS.m30) return '10s'
  if (durationMs <= MS.h1) return '1m'
  if (durationMs <= MS.h6) return '5m'
  if (durationMs <= MS.h12) return '5m'
  if (durationMs <= MS.d1) return '30m'
  return '1h'
}

export function displayStepForTimeRange(
  value: { kind: 'relative'; period: string } | { kind: 'absolute'; from: string; to: string }
): string {
  if (value.kind === 'relative') {
    return (PERIOD_CONFIGURATIONS[value.period] || PERIOD_CONFIGURATIONS['1d']).displayStep
  }
  const from = new Date(value.from.includes('T') ? value.from : `${value.from}T00:00:00`)
  const to = new Date(value.to.includes('T') ? value.to : `${value.to}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '—'
  return stepForDurationMs(to.getTime() - from.getTime())
}

function parseLocalParts(val: string): { date?: Date; time: string } {
  if (!val) return { time: '00:00' }
  const [datePart, timePart = '00:00'] = val.split(/[T ]/)
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return { time: timePart.substring(0, 5) }
  return {
    date: new Date(y, m - 1, d),
    time: timePart.substring(0, 5),
  }
}

/** Human-readable label for time range picker trigger and stats. */
export function formatTimeRangeLabel(value: TimeRangeValue): string {
  if (value.kind === 'relative') {
    if (value.period === '2h') return 'Last 2 Hours'
    return (PERIOD_CONFIGURATIONS[value.period] || PERIOD_CONFIGURATIONS['1d']).label
  }
  const from = parseLocalParts(value.from)
  const to = parseLocalParts(value.to)
  const fmt = (d?: Date, t?: string) => {
    if (!d) return ''
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${t}`
  }
  return `${fmt(from.date, from.time)} → ${fmt(to.date, to.time)}`
}

/** Basic absolute range validation (no chart point cap). */
export function validateBasicAbsoluteRange(from: string, to: string): string | null {
  if (!from || !to) return 'Select start and end dates'
  if (from >= to) return 'From must be before To'
  const fromDate = new Date(from.includes('T') ? from : `${from}T00:00:00`)
  const toDate = new Date(to.includes('T') ? to : `${to}T00:00:00`)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 'Unable to parse date range'
  }
  return null
}

/** Client-side guard before absolute range API calls (point cap mirrors backend). */
export function validateAbsoluteRange(from: string, to: string): string | null {
  if (!from || !to) return 'Select start and end dates'
  if (from >= to) return 'From must be before To'

  const fromDate = new Date(from.includes('T') ? from : `${from}T00:00:00`)
  const toDate = new Date(to.includes('T') ? to : `${to}T00:00:00`)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 'Unable to parse date range'
  }

  const durationMs = toDate.getTime() - fromDate.getTime()
  const stepKey = stepForDurationMs(durationMs)
  const stepMs = STEP_MS[stepKey] ?? STEP_MS['1h']
  const estimated = Math.floor(durationMs / stepMs) + 1
  if (estimated > MAX_METRIC_SERIES_POINTS) {
    return `Range is too wide for step ${stepKey} (about ${estimated} points, max ${MAX_METRIC_SERIES_POINTS}). Choose a shorter range.`
  }
  return null
}
