import * as React from 'react'

import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { DeltaBadge } from '@/components/ui/delta-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkline } from '@/components/ui/sparkline'
import {
  useAddKeywords,
  useKeywords,
  useLogRanksForDate,
  useSetKeywordTarget,
  useSetSearchVolume,
  type KeywordMatrixRow,
  type KeywordStats,
} from '@/features/projects/use-keywords'
import { useCurrentMember } from '@/features/team/use-current-member'

function TableRowLike({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border-light-2">{children}</tr>
}

function rankTone(rank: number | null): { bg: string; fg: string } {
  if (rank == null) return { bg: 'transparent', fg: 'var(--color-ink-faint)' }
  if (rank <= 3) return { bg: 'var(--color-pill-green-bg)', fg: 'var(--color-pill-green-fg)' }
  if (rank <= 10) return { bg: 'var(--color-pill-amber-bg)', fg: 'var(--color-pill-amber-fg)' }
  return { bg: 'var(--color-pill-neutral-bg)', fg: 'var(--color-ink-secondary)' }
}

function RankBadge({ rank }: { rank: number | null }) {
  const { bg, fg } = rankTone(rank)
  if (rank == null) return <span className="text-[12px]" style={{ color: fg }}>—</span>
  return (
    <span
      className="inline-grid place-items-center min-w-[26px] h-[22px] px-[6px] rounded-full font-mono text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {rank}
    </span>
  )
}

type PositionFilter = 'all' | 'top3' | 'top10' | 'top30' | 'unranked'

function matchesFilter(latestRank: number | null, filter: PositionFilter) {
  if (filter === 'all') return true
  if (filter === 'unranked') return latestRank == null
  if (latestRank == null) return false
  if (filter === 'top3') return latestRank <= 3
  if (filter === 'top10') return latestRank <= 10
  return latestRank <= 30
}

// Clickable stat tiles double as a position-range filter for the table
// below — the same "click a stat to filter the rankings by it" pattern
// SE Ranking's own position-filter segmented control uses.
function StatTileSmall({
  label,
  value,
  active,
  onClick,
  extra,
}: {
  label: string
  value: string
  active?: boolean
  onClick?: () => void
  extra?: React.ReactNode
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`rounded-[10px] p-[10px_12px] flex flex-col gap-[3px] text-left transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active
          ? 'bg-brand text-white border border-brand'
          : 'bg-surface-sunken border border-border-light hover:border-border'
      }`}
    >
      <span
        className={`font-mono text-[9.5px] tracking-[0.1em] uppercase ${active ? 'text-white/70' : 'text-ink-muted'}`}
      >
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[18px] font-semibold tracking-[-0.02em] leading-none">{value}</span>
        {extra}
      </div>
    </Tag>
  )
}

function KeywordMatrixRowView({
  keyword,
  index,
  projectId,
  displayDates,
  loggingDate,
  draftValue,
  onDraftChange,
}: {
  keyword: KeywordMatrixRow
  index: number
  projectId: string
  displayDates: string[]
  loggingDate: string | null
  draftValue: string
  onDraftChange: (keywordId: string, value: string) => void
}) {
  const setTarget = useSetKeywordTarget(projectId)
  const setVolume = useSetSearchVolume(projectId)
  const [targetInput, setTargetInput] = React.useState(
    keyword.targetRank != null ? String(keyword.targetRank) : '',
  )
  const [volumeInput, setVolumeInput] = React.useState(
    keyword.searchVolume != null ? String(keyword.searchVolume) : '',
  )

  const hitTarget = keyword.targetRank != null && keyword.latestRank != null && keyword.latestRank <= keyword.targetRank

  return (
    <TableRowLike>
      <td className="p-[11px_10px] font-mono text-[11px] text-ink-muted">{index + 1}</td>
      <td className="p-[11px_18px]">
        <div className="flex flex-col gap-[1px]">
          <span>{keyword.phrase}</span>
          {keyword.targetUrl && (
            <span className="font-mono text-[10.5px] text-ink-muted truncate max-w-[220px]">
              {keyword.targetUrl}
            </span>
          )}
        </div>
      </td>
      <td className="p-[11px_12px]">
        <input
          value={volumeInput}
          onChange={(e) => setVolumeInput(e.target.value)}
          onBlur={() => {
            const next = volumeInput.trim() ? Number(volumeInput) : null
            if (next !== keyword.searchVolume) {
              setVolume.mutate({ keywordId: keyword.id, searchVolume: next })
            }
          }}
          placeholder="—"
          inputMode="numeric"
          className="w-[64px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1"
        />
      </td>
      <td className="p-[11px_12px]">
        <div className="flex items-center gap-[4px]">
          <input
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={() => {
              const next = targetInput.trim() ? Number(targetInput) : null
              if (next !== keyword.targetRank) {
                setTarget.mutate({ keywordId: keyword.id, targetRank: next })
              }
            }}
            placeholder="—"
            inputMode="numeric"
            className="w-[44px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1"
          />
          {hitTarget && <span className="text-[11px] text-signal-green">✓</span>}
        </div>
      </td>
      {loggingDate && (
        <td className="p-[6px_10px] bg-surface-sunken">
          <input
            value={draftValue}
            onChange={(e) => onDraftChange(keyword.id, e.target.value)}
            placeholder="Rank"
            inputMode="numeric"
            className="w-[56px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
          />
        </td>
      )}
      {displayDates.map((date, i) => (
        <td
          key={date}
          className={`p-[8px_12px] text-center ${i === 0 && !loggingDate ? 'bg-surface-sunken' : ''}`}
        >
          <RankBadge rank={keyword.ranksByDate[date] ?? null} />
        </td>
      ))}
    </TableRowLike>
  )
}

// Jumped/dropped/unchanged since the previous check date, as one segmented
// bar + a breakdown row — mirrors SE Ranking's own "distribution of top
// positions" movement panel, built from latestRank vs. previousRank
// (already computed per keyword), not a fabricated trend.
function MovementBreakdown({ stats }: { stats: KeywordStats }) {
  const total = stats.jumped + stats.dropped + stats.unchanged
  if (total === 0) return null

  const pct = (n: number) => Math.round((n / total) * 100)
  const segments = [
    { label: 'Jumped', value: stats.jumped, color: 'var(--color-signal-green)' },
    { label: 'Dropped', value: stats.dropped, color: 'var(--color-signal-red)' },
    { label: 'Unchanged', value: stats.unchanged, color: 'var(--color-ink-faint)' },
  ]

  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-muted">
        Since last check · {total} compared
      </span>
      <div className="h-[8px] rounded-[4px] overflow-hidden flex bg-track">
        {segments.map((s) =>
          s.value > 0 ? (
            <span key={s.label} style={{ width: `${pct(s.value)}%`, background: s.color }} />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-[14px]">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-[6px] text-[12px]">
            <span className="w-[8px] h-[8px] rounded-full flex-none" style={{ background: s.color }} />
            <span className="text-ink-secondary">{s.label}</span>
            <span className="font-mono text-ink-muted">
              {s.value} ({pct(s.value)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function AddKeywordsBox({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState('')
  const addKeywords = useAddKeywords(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add keywords
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'One keyword per line, e.g.\nlocal seo services\nseo audit checklist'}
        rows={4}
        className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none font-mono"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!text.trim() || addKeywords.isPending}
          onClick={() => {
            const phrases = Array.from(
              new Set(
                text
                  .split('\n')
                  .map((p) => p.trim())
                  .filter(Boolean),
              ),
            )
            addKeywords.mutate(phrases, {
              onSuccess: () => {
                setText('')
                setOpen(false)
              },
            })
          }}
        >
          {addKeywords.isPending ? 'Adding…' : 'Add keywords'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {addKeywords.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addKeywords.error instanceof Error ? addKeywords.error.message : 'Failed to add keywords'}
        </p>
      )}
    </div>
  )
}

export function KeywordsSection({ projectId }: { projectId: string }) {
  const { data, isLoading } = useKeywords(projectId)
  const { data: currentMember } = useCurrentMember()
  const logRanks = useLogRanksForDate(projectId)

  const [loggingDate, setLoggingDate] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Record<string, string>>({})
  const [positionFilter, setPositionFilter] = React.useState<PositionFilter>('all')

  const beginLogging = (date: string) => {
    const seed: Record<string, string> = {}
    for (const row of data?.rows ?? []) {
      const v = row.ranksByDate[date]
      if (v != null) seed[row.id] = String(v)
    }
    setDraft(seed)
    setLoggingDate(date)
  }

  const cancelLogging = () => {
    setLoggingDate(null)
    setDraft({})
  }

  const displayDates = data ? (loggingDate ? data.dates.filter((d) => d !== loggingDate) : data.dates) : []
  const hasDraftValues = Object.values(draft).some((v) => v.trim())
  const filteredRows = (data?.rows ?? []).filter((r) => matchesFilter(r.latestRank, positionFilter))

  // Daily average position across every tracked keyword, oldest check date
  // first — a real trend from data already collected, for the sparkline and
  // the "vs previous check" delta next to the Avg position tile.
  const avgPositionByDate = data
    ? [...data.dates]
        .reverse()
        .map((date) => {
          const ranks = data.rows.map((r) => r.ranksByDate[date]).filter((r): r is number => r != null)
          return ranks.length > 0 ? ranks.reduce((s, r) => s + r, 0) / ranks.length : null
        })
        .filter((v): v is number => v != null)
    : []
  const avgPositionDeltaPct =
    avgPositionByDate.length >= 2 && avgPositionByDate[avgPositionByDate.length - 2] > 0
      ? ((avgPositionByDate[avgPositionByDate.length - 1] - avgPositionByDate[avgPositionByDate.length - 2]) /
          avgPositionByDate[avgPositionByDate.length - 2]) *
        100
      : null

  return (
    <div className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[var(--shadow-sm)]">
      <div className="flex items-baseline justify-between gap-3 p-[14px_18px] border-b border-border-light">
        <CardTitle>Keywords</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">Manually tracked, no rank-check API connected</span>
      </div>
      <div className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[80px] w-full" />}
        {!isLoading && data && (
          <>
            <section
              className="grid gap-[10px]"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
            >
              <StatTileSmall
                label="Tracked"
                value={String(data.stats.tracked)}
                active={positionFilter === 'all'}
                onClick={() => setPositionFilter('all')}
              />
              <StatTileSmall
                label="Avg position"
                value={data.stats.averagePosition != null ? data.stats.averagePosition.toFixed(1) : '—'}
                extra={
                  avgPositionByDate.length >= 2 ? (
                    <div className="flex items-center gap-[6px]">
                      <Sparkline data={avgPositionByDate} color="var(--color-brand)" reverseY />
                      {avgPositionDeltaPct != null && (
                        <DeltaBadge pct={avgPositionDeltaPct} goodDirection="down" />
                      )}
                    </div>
                  ) : undefined
                }
              />
              <StatTileSmall
                label="Top 3"
                value={String(data.stats.top3)}
                active={positionFilter === 'top3'}
                onClick={() => setPositionFilter('top3')}
              />
              <StatTileSmall
                label="Top 10"
                value={String(data.stats.top10)}
                active={positionFilter === 'top10'}
                onClick={() => setPositionFilter('top10')}
              />
              <StatTileSmall
                label="Top 30"
                value={String(data.stats.top30)}
                active={positionFilter === 'top30'}
                onClick={() => setPositionFilter('top30')}
              />
              <StatTileSmall
                label="Not ranked"
                value={String(data.rows.filter((r) => r.latestRank == null).length)}
                active={positionFilter === 'unranked'}
                onClick={() => setPositionFilter('unranked')}
              />
            </section>

            <MovementBreakdown stats={data.stats} />

            <div className="flex items-center gap-2">
              {loggingDate == null ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => beginLogging(new Date().toISOString().slice(0, 10))}
                >
                  Log ranks for a date
                </Button>
              ) : (
                <>
                  <input
                    type="date"
                    value={loggingDate}
                    onChange={(e) => beginLogging(e.target.value)}
                    className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
                  />
                  <Button
                    size="sm"
                    disabled={!hasDraftValues || logRanks.isPending}
                    onClick={() => {
                      const entries = Object.entries(draft)
                        .filter(([, v]) => v.trim())
                        .map(([keywordId, v]) => ({ keywordId, rank: Number(v) }))
                      logRanks.mutate(
                        { checkedOn: loggingDate, entries, checkedBy: currentMember?.id ?? null },
                        { onSuccess: cancelLogging },
                      )
                    }}
                  >
                    {logRanks.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={cancelLogging}>
                    Cancel
                  </Button>
                </>
              )}
              {logRanks.isError && (
                <p className="m-0 text-[12px] text-signal-red">
                  {logRanks.error instanceof Error ? logRanks.error.message : 'Failed to save ranks'}
                </p>
              )}
            </div>

            {data.rows.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-muted">No keywords tracked yet — add some below.</p>
            ) : filteredRows.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-muted">
                No keywords match this filter.{' '}
                <button
                  onClick={() => setPositionFilter('all')}
                  className="border-none bg-transparent text-brand hover:underline cursor-pointer p-0 font-inherit"
                >
                  Clear filter
                </button>
              </p>
            ) : (
              <div className="overflow-x-auto border border-border-light rounded-[10px]">
                <table className="w-full min-w-[480px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left bg-surface-sunken">
                      <th className="p-[9px_10px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Sr.No
                      </th>
                      <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Keyword
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Search vol.
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Target
                      </th>
                      {loggingDate && (
                        <th className="p-[9px_10px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light bg-surface-sunken">
                          {loggingDate}
                        </th>
                      )}
                      {displayDates.map((date, i) => (
                        <th
                          key={date}
                          className={`p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light text-center ${i === 0 && !loggingDate ? 'bg-surface-sunken' : ''}`}
                        >
                          {date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((k, i) => (
                      <KeywordMatrixRowView
                        key={k.id}
                        keyword={k}
                        index={i}
                        projectId={projectId}
                        displayDates={displayDates}
                        loggingDate={loggingDate}
                        draftValue={draft[k.id] ?? ''}
                        onDraftChange={(keywordId, value) =>
                          setDraft((prev) => ({ ...prev, [keywordId]: value }))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddKeywordsBox projectId={projectId} />
          </>
        )}
      </div>
    </div>
  )
}
