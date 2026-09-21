import { AlertTriangle } from 'lucide-react'
import * as React from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  DISCIPLINES,
  useAssignFromPlanner,
  useCapacity,
  type CapacityRow,
} from '@/features/capacity/use-capacity'
import {
  useAddLeave,
  useDeleteLeave,
  useLeave,
} from '@/features/capacity/use-leave'
import { useProjects } from '@/features/projects/use-projects'
import { useCurrentMember } from '@/features/team/use-current-member'
import { initials, tintFor } from '@/lib/avatar'
import { loadColorFor } from '@/lib/load-color'

const DISCIPLINE_LABEL: Record<(typeof DISCIPLINES)[number], string> = {
  technical: 'Technical',
  content: 'Content',
  offpage: 'Off-page',
  analytics: 'Analytics',
}

const LEAVE_KINDS = ['leave', 'holiday', 'sick']

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

function StaffRow({ member, tint }: { member: CapacityRow; tint: string }) {
  const pct = Math.round(member.ratio * 100)
  const color = loadColorFor(member.ratio)
  const [assigning, setAssigning] = React.useState(false)
  const [projectId, setProjectId] = React.useState('')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const { data: projects } = useProjects()
  const assign = useAssignFromPlanner()

  const openProjects = (projects ?? []).filter((p) => p.status !== 'shipped')
  const previewHours = weeklyHours ? Number(weeklyHours) : 0
  const previewTotal = member.booked + previewHours
  const wouldOverbook = member.capacity > 0 && previewTotal > member.capacity

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-[10px]">
            <span
              className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
              style={{ background: tint }}
            >
              {initials(member.name)}
            </span>
            <div className="flex flex-col gap-[1px]">
              <span className="font-medium">{member.name}</span>
              <span className="text-[11px] text-ink-muted capitalize">{member.role}</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-[12px] text-ink-secondary">
          {member.projectCount}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-[10px]">
            <div className="flex-1">
              <ProgressBar pct={pct} color={color} />
            </div>
            <span className="font-mono text-[11.5px] min-w-[54px]" style={{ color }}>
              {member.booked}/{member.capacity}h
            </span>
          </div>
        </TableCell>
        {DISCIPLINES.map((d) => (
          <TableCell key={d}>
            <span
              className="inline-grid place-items-center w-6 h-6 rounded-[6px] font-mono text-[11.5px] font-semibold"
              style={skillTileStyle(member.skills[d])}
            >
              {member.skills[d] ?? '—'}
            </span>
          </TableCell>
        ))}
        <TableCell>
          <Button size="sm" variant="secondary" onClick={() => setAssigning((v) => !v)}>
            {assigning ? 'Close' : 'Staff'}
          </Button>
        </TableCell>
      </TableRow>
      {assigning && (
        <TableRow>
          <TableCell colSpan={4 + DISCIPLINES.length} className="bg-surface-sunken">
            <div className="flex flex-wrap items-end gap-2 py-1">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface"
              >
                <option value="">Choose a project…</option>
                {openProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                placeholder="Weekly hours"
                inputMode="decimal"
                className="w-[130px] text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface"
              />
              <Button
                size="sm"
                disabled={!projectId || !weeklyHours.trim() || assign.isPending}
                onClick={() =>
                  assign.mutate(
                    { projectId, memberId: member.id, weeklyHours: Number(weeklyHours) },
                    { onSuccess: () => { setAssigning(false); setProjectId(''); setWeeklyHours('') } },
                  )
                }
              >
                {assign.isPending ? 'Staffing…' : 'Confirm'}
              </Button>
              {previewHours > 0 && (
                <span
                  className="font-mono text-[11.5px]"
                  style={{ color: wouldOverbook ? 'var(--color-signal-red)' : 'var(--color-ink-muted)' }}
                >
                  {wouldOverbook
                    ? `⚠ Would overbook: ${previewTotal}/${member.capacity}h`
                    : `New total: ${previewTotal}/${member.capacity}h`}
                </span>
              )}
              {assign.isError && (
                <span className="text-[12px] text-signal-red">
                  {assign.error instanceof Error ? assign.error.message : 'Failed to staff'}
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function LeaveCard() {
  const { data: leave, isLoading } = useLeave()
  const { data: currentMember } = useCurrentMember()
  const addLeave = useAddLeave()
  const deleteLeave = useDeleteLeave()
  const [showForm, setShowForm] = React.useState(false)
  const [startsOn, setStartsOn] = React.useState('')
  const [endsOn, setEndsOn] = React.useState('')
  const [kind, setKind] = React.useState('leave')
  const [note, setNote] = React.useState('')

  const isManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const canRemove = (memberId: string) => isManager || memberId === currentMember?.id

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave &amp; availability</CardTitle>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Log leave
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {showForm && currentMember && (
          <div className="flex flex-wrap items-end gap-2 p-[10px] border border-border-light rounded-[10px] bg-surface-sunken-2">
            <span className="text-[12.5px] text-ink-secondary">
              {isManager ? 'For yourself' : 'For'} <strong>{currentMember.name}</strong>
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface"
            >
              {LEAVE_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface"
            />
            <input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface flex-1 min-w-[140px]"
            />
            <Button
              size="sm"
              disabled={!startsOn || !endsOn || addLeave.isPending}
              onClick={() =>
                addLeave.mutate(
                  { memberId: currentMember.id, startsOn, endsOn, kind, note },
                  {
                    onSuccess: () => {
                      setShowForm(false)
                      setStartsOn('')
                      setEndsOn('')
                      setNote('')
                    },
                  },
                )
              }
            >
              {addLeave.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        )}
        {addLeave.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {addLeave.error instanceof Error ? addLeave.error.message : 'Failed to log leave'}
          </p>
        )}
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && (leave ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No upcoming or current leave logged.</p>
        )}
        {!isLoading &&
          (leave ?? []).map((l) => (
            <div key={l.id} className="flex items-center gap-[10px]">
              <Badge tone={l.kind === 'sick' ? 'red' : l.kind === 'holiday' ? 'blue' : 'amber'}>
                {l.kind}
              </Badge>
              <div className="flex flex-col gap-[1px] flex-1 min-w-0">
                <span className="text-[13px] font-medium">{l.memberName}</span>
                <span className="text-[11.5px] text-ink-muted">
                  {l.startsOn} → {l.endsOn}
                  {l.note ? ` · ${l.note}` : ''}
                </span>
              </div>
              {canRemove(l.memberId) && (
                <button
                  onClick={() => deleteLeave.mutate(l.id)}
                  disabled={deleteLeave.isPending}
                  className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  )
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
            <Table className="min-w-[940px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead style={{ width: '230px' }}>Booked</TableHead>
                  {DISCIPLINES.map((d) => (
                    <TableHead key={d}>{DISCIPLINE_LABEL[d]}</TableHead>
                  ))}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r, i) => (
                  <StaffRow key={r.id} member={r} tint={tintFor(i)} />
                ))}
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

      <LeaveCard />
    </div>
  )
}
