// Stage 8 — anomaly detection. Separates a real drop from seasonality
// by comparing each day against the mean/stddev of the *same weekday*
// over the available history, not the previous day — a Sunday dip
// that happens every Sunday isn't an anomaly. Threshold is 1.5
// standard deviations rather than the textbook 2, because Stage 4's
// window is only ~28 days (about 4 samples per weekday) — a looser
// threshold flags real outliers without demanding more history than
// this app actually keeps. A weekday with fewer than 2 prior samples
// is skipped entirely rather than guessed at.

import type { DailyValue } from '@/features/intelligence/forecast'

export interface Anomaly {
  date: string
  value: number
  expected: number
  direction: 'spike' | 'drop'
}

function stddev(values: number[], mean: number) {
  if (values.length < 2) return 0
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function detectAnomalies(points: DailyValue[]): Anomaly[] {
  const byWeekday = new Map<number, DailyValue[]>()
  for (const p of points) {
    const day = new Date(`${p.date}T00:00:00Z`).getUTCDay()
    const list = byWeekday.get(day) ?? []
    list.push(p)
    byWeekday.set(day, list)
  }

  const anomalies: Anomaly[] = []
  for (const [, dayPoints] of byWeekday) {
    if (dayPoints.length < 3) continue // need at least 2 prior + 1 to test
    const sorted = [...dayPoints].sort((a, b) => a.date.localeCompare(b.date))
    const latest = sorted[sorted.length - 1]
    const prior = sorted.slice(0, -1)
    const mean = prior.reduce((s, p) => s + p.value, 0) / prior.length
    const sd = stddev(prior.map((p) => p.value), mean)
    if (sd === 0) continue
    const z = (latest.value - mean) / sd
    if (Math.abs(z) >= 1.5) {
      anomalies.push({
        date: latest.date,
        value: latest.value,
        expected: Math.round(mean),
        direction: z > 0 ? 'spike' : 'drop',
      })
    }
  }
  return anomalies.sort((a, b) => b.date.localeCompare(a.date))
}
