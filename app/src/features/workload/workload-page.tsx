import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentMember } from '@/features/team/use-current-member'
import { useSetMemberCapacity, useWorkload, type WorkloadRow } from '@/features/workload/use-workload'
import { initials, tintFor } from '@/lib/avatar'
import { cn } from '@/lib/utils'

function utilizationColor(pct: number | null) {
  if (pct == null) return 'var(--color-ink-faint)'
  if (pct > 110) return 'var(--color-signal-red)'
  if (pct > 90) return 'var(--color-signal-amber)'
  return 'var(--color-signal-green)'
}

// Keyed by row.capacityHours at the call site (not an internal effect) so
// the edit buffer remounts fresh whenever the server value actually changes
// — after a save, or someone else's edit coming back through a refetch.
function CapacityInput({ row, canEdit }: { row: WorkloadRow; canEdit: boolean }) {
  const setCapacity = useSetMemberCapacity()
  const [value, setValue] = React.useState(row.capacityHours != null ? String(row.capacityHours) : '')

  if (!canEdit) {
    return <span className="font-mono text-[12px] text-ink-muted w-[52px] text-right">{row.capacityHours ?? '—'}h</span>
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim() ? Number(value) : null
        if (next !== row.capacityHours) {
          setCapacity.mutate({ memberId: row.memberId, weeklyCapacityHours: next })
        }
      }}
      placeholder="—"
      inputMode="decimal"
      className="w-[52px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1 text-right"
    />
  )
}

function WorkloadRowView({ row, canEdit }: { row: WorkloadRow; canEdit: boolean }) {
  const [open, setOpen] = React.useState(false)
  const hasBreakdown = row.assignments.length > 0

  return (
    <div className="border-b border-border-light-2 last:border-b-0">
      <div
        onClick={() => hasBreakdown && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-[12px] py-[11px] w-full text-left',
          hasBreakdown ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <ChevronDown
          size={13}
          className={cn('flex-none text-ink-faint transition-transform', !hasBreakdown && 'opacity-0', open && 'rotate-180')}
        />
        <span
          className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
          style={{ background: tintFor(row.name.length) }}
        >
          {initials(row.name)}
        </span>
        <span className="text-[13px] font-medium flex-[1_1_120px] min-w-0 truncate">{row.name}</span>

        <div className="flex-[2_1_160px] min-w-[120px] flex flex-col gap-[3px]">
          <ProgressBar pct={Math.min(100, row.utilizationPct ?? 0)} color={utilizationColor(row.utilizationPct)} />
          <span className="font-mono text-[10.5px] text-ink-muted">
            {row.assignedHours}h assigned
            {row.capacityHours != null ? ` of ${row.capacityHours}h` : ' · capacity not set'}
            {row.utilizationPct != null && ` · ${row.utilizationPct}%`}
          </span>
        </div>

        <span className="font-mono text-[12px] text-ink-secondary w-[90px] text-right flex-none">
          {row.loggedHoursThisWeek.toFixed(1)}h logged
        </span>

        <span onClick={(e) => e.stopPropagation()}>
          <CapacityInput key={row.capacityHours ?? 'unset'} row={row} canEdit={canEdit} />
        </span>
      </div>

      {open && hasBreakdown && (
        <div className="flex flex-col pl-[48px] pb-[10px] gap-[4px]">
          {row.assignments.map((a) => (
            <div key={a.projectId} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate">
                {a.accountId ? (
                  <Link to={`/clients/${a.accountId}`} className="text-brand hover:underline no-underline">
                    {a.accountName ?? a.projectName}
                  </Link>
                ) : (
                  <span className="text-ink-secondary">{a.projectName}</span>
                )}
              </span>
              <span className="font-mono text-ink-muted flex-none">{a.weeklyHours}h/wk</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WorkloadPage() {
  const { data, isLoading } = useWorkload()
  const { data: currentMember } = useCurrentMember()
  const isAdmin = currentMember?.role === 'admin'

  const rows = data ?? []
  const overloaded = rows.filter((r) => (r.utilizationPct ?? 0) > 110)
  const noCapacitySet = rows.filter((r) => r.capacityHours == null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Assigned hours vs. capacity, this week's logged hours
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Workload</h1>
      </div>

      <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
        <CardHeader>
          <CardTitle>Team</CardTitle>
          {!isAdmin && (
            <span className="font-mono text-[11px] text-ink-muted">Only admins can edit capacity</span>
          )}
        </CardHeader>
        <CardContent className="p-[16px_18px]">
          {isLoading && <Skeleton className="h-[160px] w-full" />}
          {!isLoading && rows.length === 0 && (
            <p className="m-0 text-[13px] text-ink-muted">No active team members yet.</p>
          )}
          {!isLoading &&
            rows.map((r) => <WorkloadRowView key={r.memberId} row={r} canEdit={isAdmin} />)}
        </CardContent>
      </Card>

      {!isLoading && (overloaded.length > 0 || noCapacitySet.length > 0) && (
        <div className="flex flex-wrap gap-[8px] font-mono text-[11.5px] text-ink-muted">
          {overloaded.length > 0 && (
            <span className="text-signal-red">
              {overloaded.length} over 110% assigned-to-capacity: {overloaded.map((r) => r.name).join(', ')}
            </span>
          )}
          {noCapacitySet.length > 0 && (
            <span>
              {noCapacitySet.length} with no capacity set: {noCapacitySet.map((r) => r.name).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
