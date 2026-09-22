import * as React from 'react'

import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamMembers } from '@/features/accounts/use-account'
import {
  hoursWorked,
  todayIso,
  useMyRecentAttendance,
  usePunchIn,
  usePunchOut,
  useTodayAttendance,
  type AttendanceEntry,
} from '@/features/attendance/use-attendance'
import { useAddLeave, useDeleteLeave, useLeave, type LeaveEntry, type LeaveKind } from '@/features/attendance/use-leave'
import { useCurrentMember } from '@/features/team/use-current-member'
import { initials, tintFor } from '@/lib/avatar'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const LEAVE_KIND_LABEL: Record<LeaveKind, string> = {
  leave: 'Leave',
  holiday: 'Holiday',
  sick: 'Sick',
}
const LEAVE_KIND_TONE: Record<LeaveKind, PillTone> = {
  leave: 'neutral',
  holiday: 'amber',
  sick: 'red',
}

function YourAttendanceCard() {
  const { data: currentMember } = useCurrentMember()
  const { data: today, isLoading } = useTodayAttendance()
  const { data: recent } = useMyRecentAttendance(currentMember?.id)
  const punchIn = usePunchIn()
  const punchOut = usePunchOut()

  const mine = (today ?? []).find((e) => e.memberId === currentMember?.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your attendance today</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-4">
        {isLoading && <Skeleton className="h-[50px] w-full" />}
        {!isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-[2px]">
              {!mine && <span className="text-[13px] text-ink-muted">Not punched in yet today.</span>}
              {mine && !mine.punchOut && (
                <span className="text-[13px]">
                  Punched in at <strong>{formatTime(mine.punchIn)}</strong>
                </span>
              )}
              {mine && mine.punchOut && (
                <span className="text-[13px]">
                  {formatTime(mine.punchIn)} – {formatTime(mine.punchOut)} ·{' '}
                  <strong>{hoursWorked(mine)}h</strong>
                </span>
              )}
            </div>
            {!mine && (
              <Button
                disabled={!currentMember || punchIn.isPending}
                onClick={() => currentMember && punchIn.mutate(currentMember.id)}
              >
                {punchIn.isPending ? 'Punching in…' : 'Punch In'}
              </Button>
            )}
            {mine && !mine.punchOut && (
              <Button
                variant="secondary"
                disabled={punchOut.isPending}
                onClick={() => punchOut.mutate(mine.id)}
              >
                {punchOut.isPending ? 'Punching out…' : 'Punch Out'}
              </Button>
            )}
            {mine && mine.punchOut && <Badge tone="green">Done for today</Badge>}
          </div>
        )}
        {(punchIn.isError || punchOut.isError) && (
          <p className="m-0 text-[12px] text-signal-red">
            {(punchIn.error ?? punchOut.error) instanceof Error
              ? ((punchIn.error ?? punchOut.error) as Error).message
              : 'Failed'}
          </p>
        )}

        {(recent ?? []).length > 0 && (
          <details className="text-[12.5px]">
            <summary className="cursor-pointer text-ink-muted font-mono text-[11px]">
              Your last {recent!.length} days
            </summary>
            <div className="flex flex-col gap-[6px] mt-2">
              {(recent ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 font-mono text-[11.5px] text-ink-secondary">
                  <span>{formatDate(e.workDate)}</span>
                  <span>
                    {formatTime(e.punchIn)} – {e.punchOut ? formatTime(e.punchOut) : 'still in'}
                  </span>
                  <span className="text-ink-muted">{hoursWorked(e)}h</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function TeamRow({ entry, tint }: { entry: AttendanceEntry; tint: string }) {
  return (
    <div className="flex items-center gap-[10px] py-[8px] border-b border-border-light-2 last:border-b-0">
      <span
        className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
        style={{ background: tint }}
      >
        {initials(entry.memberName)}
      </span>
      <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{entry.memberName}</span>
      <span className="font-mono text-[11.5px] text-ink-secondary">
        {formatTime(entry.punchIn)} – {entry.punchOut ? formatTime(entry.punchOut) : 'still in'}
      </span>
      <span className="font-mono text-[11px] text-ink-muted w-[48px] text-right">{hoursWorked(entry)}h</span>
    </div>
  )
}

function TeamTodayCard() {
  const { data: today, isLoading } = useTodayAttendance()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team today</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">{todayIso()}</span>
      </CardHeader>
      <CardContent className="p-[16px_18px]">
        {isLoading && <Skeleton className="h-[100px] w-full" />}
        {!isLoading && (today ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nobody has punched in yet today.</p>
        )}
        {(today ?? []).map((e, i) => (
          <TeamRow key={e.id} entry={e} tint={tintFor(i)} />
        ))}
      </CardContent>
    </Card>
  )
}

function AddLeaveForm() {
  const { data: currentMember } = useCurrentMember()
  const { data: teamMembers } = useTeamMembers()
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const addLeave = useAddLeave()

  const [pickedMemberId, setPickedMemberId] = React.useState('')
  const [startsOn, setStartsOn] = React.useState(todayIso())
  const [endsOn, setEndsOn] = React.useState(todayIso())
  const [kind, setKind] = React.useState<LeaveKind>('leave')
  const [note, setNote] = React.useState('')

  const memberId = isAdminOrManager ? pickedMemberId || currentMember?.id || '' : currentMember?.id ?? ''
  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-2 py-[7px] bg-surface'

  return (
    <div className="flex flex-col gap-2 p-[12px] rounded-[10px] bg-surface-sunken-2 border border-border-light">
      <div className="flex flex-wrap items-end gap-2">
        {isAdminOrManager && (
          <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
            Who
            <select value={memberId} onChange={(e) => setPickedMemberId(e.target.value)} className={fieldClass}>
              {(teamMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
          From
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
          To
          <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as LeaveKind)} className={fieldClass}>
            {(Object.keys(LEAVE_KIND_LABEL) as LeaveKind[]).map((k) => (
              <option key={k} value={k}>{LEAVE_KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted flex-1 min-w-[140px]">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </label>
        <Button
          size="sm"
          disabled={!memberId || !startsOn || !endsOn || endsOn < startsOn || addLeave.isPending}
          onClick={() =>
            addLeave.mutate(
              { memberId, startsOn, endsOn, kind, note },
              { onSuccess: () => setNote('') },
            )
          }
        >
          {addLeave.isPending ? 'Logging…' : 'Log leave'}
        </Button>
      </div>
      {addLeave.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addLeave.error instanceof Error ? addLeave.error.message : 'Failed to log leave'}
        </p>
      )}
    </div>
  )
}

function LeaveRow({ leave, canManage }: { leave: LeaveEntry; canManage: boolean }) {
  const deleteLeave = useDeleteLeave()
  const range = leave.startsOn === leave.endsOn
    ? formatDate(leave.startsOn)
    : `${formatDate(leave.startsOn)} – ${formatDate(leave.endsOn)}`

  return (
    <div className="flex items-center gap-[10px] py-[8px] border-b border-border-light-2 last:border-b-0">
      <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{leave.memberName}</span>
      <span className="font-mono text-[11.5px] text-ink-secondary">{range}</span>
      <Badge tone={LEAVE_KIND_TONE[leave.kind]}>{LEAVE_KIND_LABEL[leave.kind]}</Badge>
      {leave.note && <span className="text-[12px] text-ink-muted truncate max-w-[160px]">{leave.note}</span>}
      {canManage && (
        <button
          onClick={() => deleteLeave.mutate(leave.id)}
          disabled={deleteLeave.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      )}
    </div>
  )
}

function LeaveCard() {
  const { data: currentMember } = useCurrentMember()
  const { data: leave, isLoading } = useLeave()
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'

  const today = todayIso()
  const upcoming = (leave ?? []).filter((l) => l.endsOn >= today)
  const past = (leave ?? []).filter((l) => l.endsOn < today)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <AddLeaveForm />

        {isLoading && <Skeleton className="h-[100px] w-full" />}
        {!isLoading && (
          <>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Upcoming &amp; current
              </h3>
              {upcoming.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">Nobody's booked leave right now.</p>
              )}
              {upcoming.map((l) => (
                <LeaveRow
                  key={l.id}
                  leave={l}
                  canManage={isAdminOrManager || l.memberId === currentMember?.id}
                />
              ))}
            </div>

            {past.length > 0 && (
              <details className="text-[12.5px]">
                <summary className="cursor-pointer text-ink-muted font-mono text-[11px]">
                  Past ({past.length})
                </summary>
                <div className="flex flex-col mt-2">
                  {past.map((l) => (
                    <LeaveRow
                      key={l.id}
                      leave={l}
                      canManage={isAdminOrManager || l.memberId === currentMember?.id}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function AttendancePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Punch in/out and leave, team-wide
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Leave &amp; Attendance</h1>
      </div>

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_420px] min-w-0">
          <YourAttendanceCard />
        </div>
        <div className="flex-[1_1_420px] min-w-0">
          <TeamTodayCard />
        </div>
      </section>

      <LeaveCard />
    </div>
  )
}
