// A semi-circle gauge — inspired by dashboards that lead with one hero
// percentage (a "site health" style dial), rebuilt in this app's own
// tokens rather than copied pixel-for-pixel. Pure SVG, no chart library.
export function Gauge({
  pct,
  color,
  label,
  size = 120,
}: {
  pct: number
  color: string
  label?: string
  size?: number
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = 50
  const cx = 60
  const cy = 60
  const halfCirc = Math.PI * r
  const filled = (clamped / 100) * halfCirc

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 120 68" width={size} height={size * 0.57}>
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${halfCirc}`}
        />
      </svg>
      <div className="flex flex-col items-center -mt-[30px]">
        <span className="text-[24px] font-semibold tracking-[-0.02em] leading-none">{Math.round(clamped)}%</span>
        {label && <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-muted mt-[4px]">{label}</span>}
      </div>
    </div>
  )
}
