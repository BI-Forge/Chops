import { formatDateForAPI } from './dateFormat'
import { PERIOD_CONFIGURATIONS, type TimeRangeValue } from './metricStep'

export const QUERIES_TIME_RANGE_KEY = 'queriesTimeRange'

/** Relative presets supported by query-log `last` param (backend presetDurations). */
const QUERY_LAST_BY_PERIOD: Record<string, string> = {
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '12h': '12h',
}

const LEGACY_PERIOD: Record<string, string> = {
  '15min': '10m',
  '30min': '30m',
  '1h': '1h',
  '2h': '2h',
}

function isQueriesRelativePeriod(period: string): boolean {
  return !!PERIOD_CONFIGURATIONS[period] || period === '2h'
}

function parseApiPeriodMs(apiPeriod: string): number {
  const m = apiPeriod.match(/^(\d+)(m|h|d)$/)
  if (!m) return 60 * 60 * 1000
  const n = parseInt(m[1], 10)
  switch (m[2]) {
    case 'm':
      return n * 60 * 1000
    case 'h':
      return n * 60 * 60 * 1000
    case 'd':
      return n * 24 * 60 * 60 * 1000
    default:
      return 60 * 60 * 1000
  }
}

function formatLocalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Map unified time range to query-log API filter (last or from/to). */
export function timeRangeToQueryFilter(
  value: TimeRangeValue
): { last?: string; from?: string; to?: string } {
  if (value.kind === 'absolute') {
    return {
      from: formatDateForAPI(value.from),
      to: formatDateForAPI(value.to),
    }
  }

  const last = QUERY_LAST_BY_PERIOD[value.period]
  if (last) return { last }

  const cfg = PERIOD_CONFIGURATIONS[value.period] || PERIOD_CONFIGURATIONS['1h']
  const durationMs = parseApiPeriodMs(cfg.apiPeriod)
  const to = new Date()
  const from = new Date(to.getTime() - durationMs)
  return {
    from: formatDateForAPI(formatLocalDateTime(from)),
    to: formatDateForAPI(formatLocalDateTime(to)),
  }
}

export function loadQueriesTimeRange(): TimeRangeValue {
  try {
    const raw = sessionStorage.getItem(QUERIES_TIME_RANGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TimeRangeValue
      if (parsed.kind === 'relative' && isQueriesRelativePeriod(parsed.period)) {
        return parsed
      }
      if (parsed.kind === 'absolute' && parsed.from && parsed.to) {
        return parsed
      }
    }
  } catch {
    // ignore corrupt storage
  }

  const from = sessionStorage.getItem('queriesDateFrom') || ''
  const to = sessionStorage.getItem('queriesDateTo') || ''
  if (from || to) {
    return { kind: 'absolute', from, to: to || from }
  }

  const legacy = sessionStorage.getItem('queriesSelectedPeriod') || '1h'
  const period = LEGACY_PERIOD[legacy] || (isQueriesRelativePeriod(legacy) ? legacy : '1h')
  return { kind: 'relative', period }
}
