// Stage 8 — traffic forecasting. Pure computation over the daily
// points Stage 4 already fetches (metric_snapshots via
// useSearchPerformance/useMetaPerformance) — no new queries, no new
// tables. A simple linear trend (ordinary least squares over the
// available window), not a real time-series model — documented as
// such rather than dressed up as more sophisticated than it is.

export interface DailyValue {
  date: string
  value: number
}

export interface ForecastResult {
  dailyAverage: number
  trendPerDay: number
  projectedTotal: number
  daysInWindow: number
  goal: number | null
  onTrackPct: number | null
}

// Ordinary least squares slope/intercept over index (0..n-1) vs value,
// then projects the sum across the same window length forward from
// today (i.e. "if this trend holds, what would this window's total
// be").
export function forecastTrend(points: DailyValue[], goal: number | null): ForecastResult | null {
  const n = points.length
  if (n < 4) return null // too little history to say anything honest

  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.value)
  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = meanY - slope * meanX

  // Project each day of the window forward (n..2n-1) using the fitted
  // line, floored at 0 (a metric can't go negative), and sum.
  let projectedTotal = 0
  for (let i = n; i < 2 * n; i++) {
    projectedTotal += Math.max(0, intercept + slope * i)
  }

  return {
    dailyAverage: meanY,
    trendPerDay: slope,
    projectedTotal,
    daysInWindow: n,
    goal,
    onTrackPct: goal != null && goal > 0 ? (projectedTotal / goal) * 100 : null,
  }
}
