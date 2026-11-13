import { TrendingDown, TrendingUp } from 'lucide-react'

// A small colored "vs previous period" pill — the one pattern that showed
// up in literally every reference dashboard sent. Only ever rendered next
// to a number we've actually computed a real previous-period value for;
// never fabricated.
export function DeltaBadge({
  pct,
  goodDirection = 'up',
  caption,
}: {
  pct: number
  goodDirection?: 'up' | 'down'
  caption?: string
}) {
  const isUp = pct >= 0
  const isGood = goodDirection === 'up' ? isUp : !isUp
  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <span className="inline-flex items-center gap-[6px]">
      <span
        className="inline-flex items-center gap-[3px] text-[11px] font-semibold px-[7px] py-[2px] rounded-full"
        style={{
          background: isGood ? 'var(--color-pill-green-bg)' : 'var(--color-pill-red-bg)',
          color: isGood ? 'var(--color-pill-green-fg)' : 'var(--color-pill-red-fg)',
        }}
      >
        <Icon size={11} strokeWidth={2.5} />
        {Math.abs(pct).toFixed(1)}%
      </span>
      {caption && <span className="font-mono text-[10.5px] text-ink-muted">{caption}</span>}
    </span>
  )
}
