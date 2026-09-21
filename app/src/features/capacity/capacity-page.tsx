import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DISCIPLINES, useCapacity } from '@/features/capacity/use-capacity'
import { initials, tintFor } from '@/lib/avatar'
import { loadColorFor } from '@/lib/load-color'

const DISCIPLINE_LABEL: Record<(typeof DISCIPLINES)[number], string> = {
  technical: 'Technical',
  content: 'Content',
  offpage: 'Off-page',
  analytics: 'Analytics',
}

function skillTileStyle(level: number | null) {
  const n = level ?? 0
  const bg = n >= 4 ? 'var(--color-pill-green-bg)' : n === 3 ? 'var(--color-border-light-2)' : 'var(--color-surface-sunken)'
  const fg = n >= 4 ? 'var(--color-pill-green-fg)' : n === 3 ? 'var(--color-ink-secondary)' : 'var(--color-ink-faint)'
  return { background: bg, color: fg }
}

function weekNumber() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.ceil((days + start.getDay() + 1) / 7)
}

export function CapacityPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCapacity()

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            Week {weekNumber()} · {data ? `${data.rows.length} people` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            Capacity &amp; strength
          </h1>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load capacity
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Alert>
      )}

      {!isError && isLoading && (
        <div className="bg-surface border border-border rounded-[12px] p-[18px] flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[38px] w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.rows.length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <p className="m-0 font-medium text-[14px]">No active team members</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Active team members will show up here once seeded.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.rows.length > 0 && (
        <>
          <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead style={{ width: '230px' }}>Booked</TableHead>
                  {DISCIPLINES.map((d) => (
                    <TableHead key={d}>{DISCIPLINE_LABEL[d]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r, i) => {
                  const pct = Math.round(r.ratio * 100)
                  const color = loadColorFor(r.ratio)
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-[10px]">
                          <span
                            className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
                            style={{ background: tintFor(i) }}
                          >
                            {initials(r.name)}
                          </span>
                          <div className="flex flex-col gap-[1px]">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-[11px] text-ink-muted capitalize">
                              {r.role}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-ink-secondary">
                        {r.projectCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-[10px]">
                          <div className="flex-1">
                            <ProgressBar pct={pct} color={color} />
                          </div>
                          <span
                            className="font-mono text-[11.5px] min-w-[54px]"
                            style={{ color }}
                          >
                            {r.booked}/{r.capacity}h
                          </span>
                        </div>
                      </TableCell>
                      {DISCIPLINES.map((d) => (
                        <TableCell key={d}>
                          <span
                            className="inline-grid place-items-center w-6 h-6 rounded-[6px] font-mono text-[11.5px] font-semibold"
                            style={skillTileStyle(r.skills[d])}
                          >
                            {r.skills[d] ?? '—'}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="m-0 text-[12.5px] text-ink-muted max-w-[62ch]">
            Skill rating 1–5 per discipline.{' '}
            {data.singlePointsOfFailure.length > 0 ? (
              <>
                A column where only one person scores 4 or above is a single
                point of failure — here that's{' '}
                {data.singlePointsOfFailure.map((d) => DISCIPLINE_LABEL[d]).join(' and ')}.
              </>
            ) : (
              'No single points of failure right now — every discipline has at least two people rated 4 or above.'
            )}
          </p>
        </>
      )}
    </div>
  )
}
