import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { detectAnomalies } from '@/features/intelligence/anomalies'
import { forecastTrend, type DailyValue } from '@/features/intelligence/forecast'
import { useAccountTrafficGoal } from '@/features/intelligence/use-account-traffic-goal'

export function ForecastAnomalyCard({
  accountId,
  metricLabel,
  points,
}: {
  accountId: string
  metricLabel: string
  points: DailyValue[]
}) {
  const { data: goal } = useAccountTrafficGoal(accountId)
  const forecast = forecastTrend(points, goal ?? null)
  const anomalies = detectAnomalies(points)

  if (!forecast && anomalies.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast &amp; anomalies</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {forecast && (
          <div className="flex flex-col gap-[4px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Projected {metricLabel} (next {forecast.daysInWindow}d, trend-based)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-semibold">{Math.round(forecast.projectedTotal).toLocaleString()}</span>
              {forecast.goal != null && (
                <span className="text-[12.5px] text-ink-muted">
                  vs. goal {forecast.goal.toLocaleString()}
                  {forecast.onTrackPct != null && (
                    <>
                      {' '}
                      (
                      <span
                        style={{
                          color: forecast.onTrackPct >= 100 ? 'var(--color-signal-green)' : 'var(--color-signal-amber)',
                        }}
                      >
                        {Math.round(forecast.onTrackPct)}% of goal
                      </span>
                      )
                    </>
                  )}
                </span>
              )}
            </div>
            <span className="text-[11px] text-ink-faint">
              Simple linear trend over the last {forecast.daysInWindow} days — not a seasonal model, just "if this
              rate holds."
            </span>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="flex flex-col gap-[6px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Anomalies (vs. same weekday's usual range)
            </span>
            {anomalies.map((a) => (
              <div key={a.date} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span>{a.date}</span>
                <span style={{ color: a.direction === 'drop' ? 'var(--color-signal-red)' : 'var(--color-signal-green)' }}>
                  {a.direction === 'drop' ? '▼' : '▲'} {a.value.toLocaleString()} (usually ~{a.expected.toLocaleString()})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
