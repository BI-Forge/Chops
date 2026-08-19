import type { MetricSeriesPoint } from '../types/metrics'

export interface TimeSeriesPoint {
  t: number
  v: number
}

export function seriesToPoints(
  points: MetricSeriesPoint[],
  round: (value: number) => number = (v) => v
): TimeSeriesPoint[] {
  const mapped: TimeSeriesPoint[] = []
  for (const point of points) {
    const t = new Date(point.timestamp).getTime()
    if (!Number.isFinite(t) || !Number.isFinite(point.value)) continue
    mapped.push({ t, v: round(point.value) })
  }
  mapped.sort((a, b) => a.t - b.t)
  return mapped
}

export function lastPointValue(points: TimeSeriesPoint[]): number {
  return points.length > 0 ? points[points.length - 1].v : 0
}
