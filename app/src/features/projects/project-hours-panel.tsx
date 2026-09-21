import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useLogTimeEntry,
  useTimeEntries,
} from '@/features/projects/use-time-entries'
import { useCurrentMember } from '@/features/team/use-current-member'

interface StaffedMember {
  id: string
  name: string
}

function monthTotals(entries: { memberId: string; memberName: string; hours: number }[]) {
  const byMember = new Map<string, { name: string; hours: number }>()
  let total = 0
  for (const e of entries) {
    total += e.hours
    const cur = byMember.get(e.memberId) ?? { name: e.memberName, hours: 0 }
    cur.hours += e.hours
    byMember.set(e.memberId, cur)
  }
  return { total, byMember: Array.from(byMember.values()) }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function LogHoursForm({
  projectId,
  staffed,
}: {
  projectId: string
  staffed: StaffedMember[]
}) {
  const { data: currentMember } = useCurrentMember()
  const selfStaffed = staffed.find((m) => m.id === currentMember?.id)
  // null = user hasn't picked explicitly yet, so the default tracks
  // self-if-staffed (once it loads) without a state-syncing effect.
  const [pickedMemberId, setPickedMemberId] = React.useState<string | null>(
    null,
  )
  const memberId =
    pickedMemberId ?? selfStaffed?.id ?? staffed[0]?.id ?? ''
  const [hours, setHours] = React.useState('')
  const [note, setNote] = React.useState('')
  const [workedOn, setWorkedOn] = React.useState(todayIso())
  const mutation = useLogTimeEntry(projectId)

  const canSubmit =
    memberId && Number(hours) > 0 && note.trim().length > 0 && !mutation.isPending

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
      <div className="flex flex-wrap gap-2">
        <select
          value={memberId}
          onChange={(e) => setPickedMemberId(e.target.value)}
          className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1 bg-surface"
        >
          {staffed.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Hours"
          className="w-[80px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
        />
        <input
          type="date"
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
          className="flex-1 text-[13px] border border-border rounded-[6px] px-2 py-1"
        />
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            mutation.mutate(
              { memberId, hours: Number(hours), note, workedOn },
              {
                onSuccess: () => {
                  setHours('')
                  setNote('')
                },
              },
            )
          }
        >
          {mutation.isPending ? 'Logging…' : 'Log hours'}
        </Button>
      </div>
      {mutation.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Failed to log hours'}
        </p>
      )}
    </div>
  )
}

export function ProjectHoursSummary({ projectId }: { projectId: string }) {
  const { data, isLoading } = useTimeEntries(projectId)
  if (isLoading) return <Skeleton className="h-4 w-28" />
  const { total, byMember } = monthTotals(data ?? [])
  if (total === 0) {
    return (
      <span className="font-mono text-[11px] text-ink-muted">
        0h logged this month
      </span>
    )
  }
  const breakdown = byMember.map((m) => `${m.name} ${m.hours}h`).join(' · ')
  return (
    <span className="font-mono text-[11px] text-ink-secondary" title={breakdown}>
      {total}h this month ({breakdown})
    </span>
  )
}

export function ProjectHoursPanel({
  projectId,
  staffed,
}: {
  projectId: string
  staffed: StaffedMember[]
}) {
  const { data, isLoading, isError, error } = useTimeEntries(projectId)

  return (
    <div className="flex flex-col gap-2">
      {isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {error instanceof Error ? error.message : 'Failed to load hours'}
        </p>
      )}
      {isLoading && <Skeleton className="h-[60px] w-full" />}
      {!isLoading && !isError && (
        <div className="flex flex-col gap-1">
          {(data ?? []).length === 0 && (
            <p className="m-0 text-[12.5px] text-ink-muted">
              No hours logged this month yet.
            </p>
          )}
          {(data ?? []).map((e) => (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3 text-[12.5px]"
            >
              <span className="text-ink-secondary flex-1 min-w-0 truncate">
                {e.note}
              </span>
              <span className="font-mono text-[11px] text-ink-muted whitespace-nowrap">
                {e.memberName} · {e.hours}h · {e.workedOn}
              </span>
            </div>
          ))}
        </div>
      )}
      {staffed.length > 0 ? (
        <LogHoursForm projectId={projectId} staffed={staffed} />
      ) : (
        <p className="m-0 text-[12px] text-ink-muted">
          Staff this project to log hours against it.
        </p>
      )}
    </div>
  )
}
