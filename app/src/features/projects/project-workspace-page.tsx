import { AlertTriangle, ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentMember } from '@/features/team/use-current-member'
import {
  useAddTask,
  useProjectWorkspace,
  useQuickLogHour,
  useToggleTask,
  type WorkspaceTask,
} from '@/features/projects/use-project-workspace'
import { initials, tintFor } from '@/lib/avatar'
import { loadColorFor } from '@/lib/load-color'
import { STAGE_LABEL, STAGE_TONE } from '@/lib/project-stage'

function TaskRow({
  task,
  projectId,
}: {
  task: WorkspaceTask
  projectId: string
}) {
  const toggle = useToggleTask(projectId)
  const quickLog = useQuickLogHour(projectId)
  const { data: currentMember } = useCurrentMember()
  const done = task.status === 'done'
  const over = task.estimateHours != null && task.loggedHours > task.estimateHours
  const met = task.estimateHours != null && task.loggedHours >= task.estimateHours

  return (
    <TableRowLike>
      <td className="p-[11px_18px]">
        <div className="flex items-center gap-[9px]">
          <button
            onClick={() => toggle.mutate({ taskId: task.id, done: !done })}
            aria-label={done ? 'Mark as not done' : 'Mark as done'}
            className="w-[13px] h-[13px] flex-none rounded-[4px] border-[1.5px] cursor-pointer p-0"
            style={{
              borderColor: done ? 'var(--color-signal-green)' : '#C3C0B5',
              background: done ? 'var(--color-signal-green)' : 'transparent',
            }}
          />
          <span className={done ? 'text-ink-faint' : 'text-ink'}>
            {task.label}
          </span>
        </div>
      </td>
      <td className="p-[11px_12px]">
        {task.ownerName ? (
          <span
            title={task.ownerName}
            className="w-6 h-6 rounded-full grid place-items-center font-mono text-[10px] font-semibold"
            style={{ background: tintFor(0) }}
          >
            {initials(task.ownerName)}
          </span>
        ) : (
          <span className="text-ink-muted text-[12px]">—</span>
        )}
      </td>
      <td
        className="p-[11px_12px] font-mono text-[12px]"
        style={{
          color: over
            ? 'var(--color-signal-red)'
            : met
              ? 'var(--color-signal-green)'
              : 'var(--color-ink-secondary)',
        }}
      >
        {task.loggedHours} / {task.estimateHours ?? '—'}h
      </td>
      <td className="p-[11px_18px]">
        <Button
          size="sm"
          variant="secondary"
          disabled={!currentMember || quickLog.isPending}
          onClick={() =>
            currentMember &&
            quickLog.mutate({
              taskId: task.id,
              taskLabel: task.label,
              memberId: currentMember.id,
            })
          }
        >
          +1h
        </Button>
      </td>
    </TableRowLike>
  )
}

function TableRowLike({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border-light-2">{children}</tr>
}

function AddTaskForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [estimateHours, setEstimateHours] = React.useState('')
  const mutation = useAddTask(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add task
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Task name"
        className="text-[13px] border border-border rounded-[6px] px-2 py-1 w-[220px]"
      />
      <input
        type="number"
        min="0.5"
        step="0.5"
        value={estimateHours}
        onChange={(e) => setEstimateHours(e.target.value)}
        placeholder="Est. h"
        className="w-[70px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
      />
      <Button
        size="sm"
        disabled={!label.trim() || mutation.isPending}
        onClick={() =>
          mutation.mutate(
            {
              label,
              ownerId: null,
              estimateHours: estimateHours ? Number(estimateHours) : null,
              dueOn: null,
            },
            {
              onSuccess: () => {
                setLabel('')
                setEstimateHours('')
                setOpen(false)
              },
            },
          )
        }
      >
        {mutation.isPending ? 'Adding…' : 'Add'}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="border-none bg-transparent text-[12px] text-ink-muted hover:text-ink cursor-pointer"
      >
        Cancel
      </button>
    </div>
  )
}

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: ws, isLoading, isError, error, refetch, isFetching } =
    useProjectWorkspace(projectId)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load this project
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
    )
  }

  if (isLoading || !ws) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  const monthlyBudget = ws.weeklyHours != null ? ws.weeklyHours * 4 : null
  const hoursPct = monthlyBudget ? (ws.hoursThisMonth / monthlyBudget) * 100 : 0
  const linksPct = ws.linkTarget ? (ws.linksLiveThisMonth / ws.linkTarget) * 100 : 0
  const checklistPct =
    ws.checklist.total > 0 ? (ws.checklist.done / ws.checklist.total) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() =>
          ws.accountId ? navigate(`/clients/${ws.accountId}`) : navigate('/projects')
        }
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> {ws.accountName ?? 'All projects'}
      </button>

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {[ws.projectType, ws.dueOn ? `due ${ws.dueOn}` : null]
              .filter(Boolean)
              .join(' · ') || '—'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            {ws.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {ws.stage && (
            <Badge tone={STAGE_TONE[ws.stage] ?? 'neutral'} className="text-[12px] px-[11px] py-[5px]">
              {STAGE_LABEL[ws.stage] ?? ws.stage}
            </Badge>
          )}
          <AddTaskForm projectId={ws.id} />
        </div>
      </div>

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_460px] min-w-0 bg-surface border border-border rounded-[12px] overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 p-[14px_18px] border-b border-border-light">
            <CardTitle>Tasks</CardTitle>
            <span className="font-mono text-[11px] text-ink-muted">
              {ws.hoursThisMonth}h logged this month
              {monthlyBudget != null ? ` of ${monthlyBudget}h budget` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left bg-surface-sunken">
                  <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Task
                  </th>
                  <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Owner
                  </th>
                  <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Logged / est
                  </th>
                  <th className="p-[9px_18px] w-[92px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Log
                  </th>
                </tr>
              </thead>
              <tbody>
                {ws.tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-[18px] text-center text-[13px] text-ink-muted">
                      No tasks yet — add one above.
                    </td>
                  </tr>
                )}
                {ws.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} projectId={ws.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-[1_1_280px] max-w-[340px] flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Assigned team</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-[11px]">
              {ws.team.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">
                  Nobody staffed on this project yet.
                </p>
              )}
              {ws.team.map((m, i) => (
                <div key={m.id} className="flex items-center gap-[10px]">
                  <span
                    className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
                    style={{ background: tintFor(i) }}
                  >
                    {initials(m.name)}
                  </span>
                  <div className="flex flex-col gap-[1px] flex-1 min-w-0">
                    <span className="text-[13px] font-medium">{m.name}</span>
                    <span className="text-[11px] text-ink-muted capitalize">
                      {m.role}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This month</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-[13px]">
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[12.5px]">Checklist complete</span>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {ws.checklist.total > 0
                      ? `${ws.checklist.done} / ${ws.checklist.total}`
                      : 'No template yet'}
                  </span>
                </div>
                <ProgressBar
                  pct={checklistPct}
                  color={loadColorFor(checklistPct / 100)}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[12.5px]">Links live</span>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {ws.linksLiveThisMonth} / {ws.linkTarget}
                  </span>
                </div>
                <ProgressBar pct={linksPct} color={loadColorFor(linksPct / 100)} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[12.5px]">Hours against budget</span>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {monthlyBudget != null
                      ? `${ws.hoursThisMonth} / ${monthlyBudget}h`
                      : `${ws.hoursThisMonth}h logged`}
                  </span>
                </div>
                {monthlyBudget != null && (
                  <ProgressBar pct={hoursPct} color={loadColorFor(hoursPct / 100)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
