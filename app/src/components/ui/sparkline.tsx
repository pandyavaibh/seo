import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

// A tiny inline trend line next to a stat number — the other pattern that
// showed up across nearly every reference dashboard. `reverseY` flips the
// axis for metrics where a lower number is better (e.g. search rank).
export function Sparkline({
  data,
  color = 'var(--color-brand)',
  height = 28,
  reverseY = false,
}: {
  data: number[]
  color?: string
  height?: number
  reverseY?: boolean
}) {
  if (data.length < 2) return null
  const points = data.map((v, i) => ({ i, v }))

  return (
    <div style={{ width: 64, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={reverseY ? ['dataMax', 'dataMin'] : ['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
