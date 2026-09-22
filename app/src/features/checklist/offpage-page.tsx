import { ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
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
import { ProjectSubNav } from '@/features/checklist/project-sub-nav'
import { currentMonthKey } from '@/features/checklist/use-checklist'
import {
  useOffpageActivity,
  useOffpageNote,
  useRecurringOffpageTasks,
  useSetOffpageCount,
  useSetOffpageNote,
  useToggleRecurringInstance,
  type OffpageActivityRow,
  type RecurringTask,
} from '@/features/checklist/use-offpage'
import { useProjectWorkspace } from '@/features/projects/use-project-workspace'
import { useCurrentMember } from '@/features/team/use-current-member'

function ActivityRow({ row, projectId, month }: { row: OffpageActivityRow; projectId: string; month: string }) {
  const { data: currentMember } = useCurrentMember()
  const setCount = useSetOffpageCount(projectId, month)
  const [value, setValue] = React.useState(String(row.done))

  const targetLabel = row.targetMin === row.targetMax ? `Target ${row.targetMax}` : `Target ${row.targetMin}-${row.targetMax}`

  return (
    <TableRow>
      <TableCell className="text-[13.5px] font-medium">{row.activityType}</TableCell>
      <TableCell className="text-[12.5px] text-ink-muted">{targetLabel}</TableCell>
      <TableCell>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const next = value.trim() ? Math.max(0, Number(value)) : 0
            if (next !== row.done) {
              setCount.mutate({ activityType: row.activityType, count: next, updatedBy: currentMember?.id ?? null })
            }
          }}
          inputMode="numeric"
          className="w-[70px] text-[13px] font-mono border border-border rounded-[6px] px-2 py-1"
        />
      </TableCell>
      <TableCell className="text-[12.5px] text-ink-muted">{row.remaining} left</TableCell>
    </TableRow>
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
          range (15-20) per that source.
        </p>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {isLoading && <Skeleton className="h-[300px] w-full" />}
            {!isLoading && projectId && data && (
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.activities.map((row) => (
                    <ActivityRow key={row.activityType} row={row} projectId={projectId} month={month} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
