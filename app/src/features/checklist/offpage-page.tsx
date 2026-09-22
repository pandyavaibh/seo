import { ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectSubNav } from '@/features/checklist/project-sub-nav'
import { currentMonthKey } from '@/features/checklist/use-checklist'
import {
  useAddOffpageEntry,
  useDeleteOffpageEntry,
  useOffpageActivity,
  useOffpageNote,
  useRecurringOffpageTasks,
  useSetOffpageNote,
  useToggleRecurringInstance,
  type OffpageActivityRow,
  type RecurringTask,
} from '@/features/checklist/use-offpage'
import { useProjectWorkspace } from '@/features/projects/use-project-workspace'
import { useCurrentMember } from '@/features/team/use-current-member'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatEntryDate(entryDate: string) {
  return new Date(`${entryDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ActivityCard({ row, projectId, month }: { row: OffpageActivityRow; projectId: string; month: string }) {
  const { data: currentMember } = useCurrentMember()
  const addEntry = useAddOffpageEntry(projectId, month)
  const deleteEntry = useDeleteOffpageEntry(projectId, month)
  const [date, setDate] = React.useState(todayKey())
  const [count, setCount] = React.useState('')
  const [note, setNote] = React.useState('')

  const targetLabel = row.targetMin === row.targetMax ? `Target ${row.targetMax}` : `Target ${row.targetMin}-${row.targetMax}`

  const submit = () => {
    const n = Number(count)
    if (!date || !count.trim() || !Number.isFinite(n) || n <= 0) return
    addEntry.mutate(
      { activityType: row.activityType, entryDate: date, count: n, note, createdBy: currentMember?.id ?? null },
      { onSuccess: () => { setCount(''); setNote('') } },
    )
  }

  return (
    <Card>
      <CardContent className="p-[14px_16px] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[13.5px] font-semibold">{row.activityType}</span>
            <span className="font-mono text-[11px] text-ink-muted">{targetLabel}</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[12px]">
            <span>{row.done} done</span>
            <span className="text-ink-muted">{row.remaining} left</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-[13px] border border-border rounded-[6px] px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
            Count
            <input
              value={count}
              onChange={(e) => setCount(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-[64px] text-[13px] font-mono border border-border rounded-[6px] px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted flex-1 min-w-[140px]">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-[13px] border border-border rounded-[6px] px-2 py-1"
            />
          </label>
          <Button size="sm" disabled={addEntry.isPending} onClick={submit}>
            {addEntry.isPending ? 'Adding…' : 'Log entry'}
          </Button>
        </div>
        {addEntry.isError && (
          <p className="m-0 text-[11.5px] text-signal-red">
            {addEntry.error instanceof Error ? addEntry.error.message : 'Failed to log entry'}
          </p>
        )}

        {row.entries.length > 0 && (
          <details className="text-[12.5px]">
            <summary className="cursor-pointer text-ink-muted">History ({row.entries.length})</summary>
            <div className="flex flex-col gap-[6px] mt-2">
              {row.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 font-mono text-[11.5px]">
                  <span className="text-ink-secondary">
                    {formatEntryDate(e.entryDate)} — +{e.count}
                    {e.note ? ` (${e.note})` : ''}
                    {e.createdByName ? ` · ${e.createdByName}` : ''}
                  </span>
                  <span className="flex items-center gap-2 flex-none text-ink-muted">
                    <span>{e.cumulativeDone} done, {e.remainingAfter} left</span>
                    <button
                      onClick={() => deleteEntry.mutate(e.id)}
                      disabled={deleteEntry.isPending}
                      className="text-signal-red border-none bg-transparent cursor-pointer p-0"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function RecurringInstanceChip({
  task,
  instanceKey,
  label,
  done,
  projectId,
  month,
}: {
  task: RecurringTask['key']
  instanceKey: string
  label: string
  done: boolean
  projectId: string
  month: string
}) {
  const { data: currentMember } = useCurrentMember()
  const toggle = useToggleRecurringInstance(projectId, month)

  return (
    <button
      onClick={() => toggle.mutate({ taskKey: task, instanceKey, done: !done, doneBy: currentMember?.id ?? null })}
      disabled={toggle.isPending}
      className="flex items-center gap-[6px] text-[12px] px-[10px] py-[5px] rounded-full border-none cursor-pointer"
      style={{
        background: done ? 'var(--color-pill-green-bg)' : 'var(--color-pill-neutral-bg)',
        color: done ? 'var(--color-pill-green-fg)' : 'var(--color-pill-neutral-fg)',
      }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'currentColor' }} />
      {label}
    </button>
  )
}

function RecurringTaskCard({ task, projectId, month }: { task: RecurringTask; projectId: string; month: string }) {
  const isSingle = task.instances.length === 1 && task.instances[0].key === 'default'

  return (
    <Card>
      <CardContent className="p-[16px_18px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold">{task.title}</span>
          <span className="text-[12px] text-ink-muted">{task.description}</span>
        </div>
        <div className="flex flex-wrap items-center gap-[6px]">
          {isSingle ? (
            <RecurringInstanceChip
              task={task.key}
              instanceKey="default"
              label={task.instances[0].done ? 'Done' : 'Mark done'}
              done={task.instances[0].done}
              projectId={projectId}
              month={month}
            />
          ) : (
            task.instances.map((inst) => (
              <RecurringInstanceChip
                key={inst.key}
                task={task.key}
                instanceKey={inst.key}
                label={inst.label}
                done={inst.done}
                projectId={projectId}
                month={month}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function NotesCard({ projectId, month }: { projectId: string; month: string }) {
  const { data: savedNote, isLoading } = useOffpageNote(projectId, month)
  const setNote = useSetOffpageNote(projectId, month)

  return (
    <div className="flex flex-col gap-2">
      <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">Notes</h2>
      <Card>
        <CardContent className="p-[16px_18px]">
          {isLoading ? (
            <Skeleton className="h-[80px] w-full" />
          ) : (
            <textarea
              key={savedNote}
              defaultValue={savedNote}
              onBlur={(e) => {
                if (e.target.value !== (savedNote ?? '')) setNote.mutate(e.target.value)
              }}
              rows={3}
              placeholder="Blockers, findings, anything worth flagging for this month…"
              className="w-full text-[13px] border border-border rounded-[8px] px-3 py-2 bg-surface resize-none"
            />
          )}
          <p className="m-0 mt-2 text-[11px] text-ink-faint">Changes save automatically as you update counts, tasks or notes.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function OffpagePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const month = currentMonthKey()
  const { data: ws } = useProjectWorkspace(projectId)
  const { data, isLoading } = useOffpageActivity(projectId, month)
  const { data: recurringTasks, isLoading: recurringLoading } = useRecurringOffpageTasks(projectId, month)

  const pct = data ? Math.min(100, (data.doneThisMonth / data.linkTarget) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> Back to projects
      </button>

      <Card>
        <CardContent className="p-[18px_20px]">
          <h1 className="m-0 text-[19px] font-semibold">{ws?.name ?? 'Project'}</h1>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">
            {month} · Assigned to {ws?.team.length ? ws.team.map((t) => t.name).join(', ') : '—'}
          </p>
        </CardContent>
      </Card>

      {projectId && <ProjectSubNav projectId={projectId} active="offpage" />}

      <Card>
        <CardContent className="p-[18px_20px] flex flex-col gap-2">
          {isLoading && <Skeleton className="h-[40px] w-full" />}
          {!isLoading && data && (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-[28px] font-semibold tracking-[-0.02em]">
                  {data.doneThisMonth} / {data.linkTarget}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  Backlinks this month
                </span>
              </div>
              <ProgressBar pct={pct} color="var(--color-signal-green)" />
              <span className="font-mono text-[11px] text-ink-muted">
                {Math.round((data.doneThisMonth / data.linkTarget) * 100)}% of monthly target
              </span>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">Backlink activity</h2>
        <p className="m-0 text-[12px] text-ink-muted">
          Per-type targets and the monthly total are from the Off-Page Activity Plan. Business Listing is shown as a
          range (15-20) per that source. Log each batch with its date — Done and Remaining are the running total for
          this month.
        </p>
        {isLoading && <Skeleton className="h-[300px] w-full" />}
        {!isLoading && projectId && data && (
          <div className="flex flex-col gap-2">
            {data.activities.map((row) => (
              <ActivityCard key={row.activityType} row={row} projectId={projectId} month={month} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">Recurring off-page tasks</h2>
        {recurringLoading && <Skeleton className="h-[200px] w-full" />}
        {!recurringLoading &&
          projectId &&
          (recurringTasks ?? []).map((task) => (
            <RecurringTaskCard key={task.key} task={task} projectId={projectId} month={month} />
          ))}
      </div>

      {projectId && <NotesCard projectId={projectId} month={month} />}
    </div>
  )
}
