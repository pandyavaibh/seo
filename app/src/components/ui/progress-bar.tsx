export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[6px] rounded-[3px] bg-track overflow-hidden">
      <div
        className="h-full rounded-[3px]"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  )
}
