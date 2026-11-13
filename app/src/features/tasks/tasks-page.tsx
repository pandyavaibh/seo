import { useQuery } from '@tanstack/react-query'
import { CheckSquare, ListTodo, Users } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'

import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useCurrentMember } from '@/features/team/use-current-member'
import {
  useCreateTask,
  useDeleteTask,
  useMyTasks,
  useTeamTasks,
  useUpdateTaskStatus,
  type NewTaskInput,
  type TaskRow,
} from '@/features/tasks/use-tasks'
import { initials, tintFor } from '@/lib/avatar'
import type { TaskPriority, TaskStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

const STATUS_LABEL: Record<TaskStatus, string> = {
  to_do: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}
const PRIORITY_TONE: Record<TaskPriority, PillTone> = {
  high: 'red',
  medium: 'amber',
  low: 'neutral',
}

function useAccountOptions() {
  return useQuery({
    queryKey: ['accounts-directory', 'task-options'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_accounts_directory')
      if (error) throw new Error(error.message)
      return (data ?? [])
        .map((a) => ({ id: a.id, name: a.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

function isOverdue(task: TaskRow) {
  return task.status !== 'done' && !!task.dueOn && task.dueOn < new Date().toISOString().slice(0, 10)
}

function formatDue(dueOn: string) {
  return new Date(`${dueOn}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function TaskRowView({ task, showAssignee }: { task: TaskRow; showAssignee?: boolean }) {
  const updateStatus = useUpdateTaskStatus()
  const deleteTask = useDeleteTask()
  const nextStatus: Record<TaskStatus, TaskStatus> = { to_do: 'in_progress', in_progress: 'done', done: 'to_do' }

  return (
    <div className="flex items-center gap-[10px] py-[10px] border-b border-border-light-2 last:border-b-0">
      <button
        onClick={() => updateStatus.mutate({ id: task.id, status: nextStatus[task.status] })}
        disabled={updateStatus.isPending}
        className={`w-[18px] h-[18px] flex-none rounded-[5px] border-2 grid place-items-center cursor-pointer bg-transparent transition-colors ${
          task.status === 'done'
            ? 'border-signal-green bg-signal-green'
            : task.status === 'in_progress'
              ? 'border-signal-amber'
              : 'border-border'
        }`}
        title={`Mark as ${STATUS_LABEL[nextStatus[task.status]]}`}
      >
        {task.status === 'done' && <CheckSquare size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex flex-col gap-[2px] min-w-0 flex-1">
        <span className={`text-[13px] font-medium truncate ${task.status === 'done' ? 'line-through text-ink-muted' : ''}`}>
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-[8px]">
          {task.accountId && (
            <Link to={`/clients/${task.accountId}`} className="font-mono text-[10.5px] text-brand hover:underline no-underline">
              {task.accountName}
            </Link>
          )}
          {showAssignee && task.assigneeName && (
            <span className="flex items-center gap-[4px] font-mono text-[10.5px] text-ink-muted">
              <span
                className="w-4 h-4 rounded-full grid place-items-center text-[7.5px] font-semibold"
                style={{ background: tintFor(task.assigneeName.length) }}
              >
                {initials(task.assigneeName)}
              </span>
              {task.assigneeName}
            </span>
          )}
          {task.dueOn && (
            <span className={`font-mono text-[10.5px] ${isOverdue(task) ? 'text-signal-red' : 'text-ink-muted'}`}>
              {isOverdue(task) ? 'Overdue ' : 'Due '}
              {formatDue(task.dueOn)}
            </span>
          )}
        </div>
      </div>

      <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>

      <button
        onClick={() => deleteTask.mutate(task.id)}
        disabled={deleteTask.isPending}
        className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0 flex-none"
      >
        Remove
      </button>
    </div>
  )
}

function AddTaskForm({ defaultAssigneeId }: { defaultAssigneeId: string }) {
  const [open, setOpen] = React.useState(false)
  const { data: teamMembers } = useTeamMembers()
  const { data: accounts } = useAccountOptions()
  const createTask = useCreateTask()

  const [input, setInput] = React.useState<NewTaskInput>({
    title: '',
    notes: '',
    priority: 'medium',
    assigneeId: defaultAssigneeId,
    accountId: '',
    dueOn: '',
  })

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  if (!open) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          // Pick up the current member as the default assignee at the moment
          // the form opens, in case it wasn't loaded yet when this component
          // first mounted.
          setInput((i) => (i.assigneeId ? i : { ...i, assigneeId: defaultAssigneeId }))
          setOpen(true)
        }}
      >
        Add task
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-[12px] rounded-[10px] bg-surface-sunken-2 border border-border-light">
      <input
        autoFocus
        value={input.title}
        onChange={(e) => setInput((i) => ({ ...i, title: e.target.value }))}
        placeholder="What needs doing?"
        className={fieldClass}
      />
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <select
          value={input.assigneeId}
          onChange={(e) => setInput((i) => ({ ...i, assigneeId: e.target.value }))}
          className={fieldClass}
        >
          <option value="">Unassigned</option>
          {(teamMembers ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={input.accountId}
          onChange={(e) => setInput((i) => ({ ...i, accountId: e.target.value }))}
          className={fieldClass}
        >
          <option value="">No client</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={input.priority}
          onChange={(e) => setInput((i) => ({ ...i, priority: e.target.value as TaskPriority }))}
          className={fieldClass}
        >
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
        <input
          type="date"
          value={input.dueOn}
          onChange={(e) => setInput((i) => ({ ...i, dueOn: e.target.value }))}
          className={fieldClass}
        />
      </div>
      <input
        value={input.notes}
        onChange={(e) => setInput((i) => ({ ...i, notes: e.target.value }))}
        placeholder="Notes (optional)"
        className={fieldClass}
      />
      {createTask.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {createTask.error instanceof Error ? createTask.error.message : 'Failed to add task'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!input.title.trim() || createTask.isPending}
          onClick={() =>
            createTask.mutate(input, {
              onSuccess: () => {
                setInput({ title: '', notes: '', priority: 'medium', assigneeId: defaultAssigneeId, accountId: '', dueOn: '' })
                setOpen(false)
              },
            })
          }
        >
          {createTask.isPending ? 'Adding…' : 'Add task'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function TaskList({ tasks, showAssignee }: { tasks: TaskRow[]; showAssignee?: boolean }) {
  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="Nothing here" description="Tasks you add will show up in this list." />
  }

  return (
    <div className="flex flex-col">
      {open.map((t) => (
        <TaskRowView key={t.id} task={t} showAssignee={showAssignee} />
      ))}
      {done.length > 0 && (
        <details className="mt-1 text-[12.5px]">
          <summary className="cursor-pointer text-ink-muted font-mono text-[11px] py-[6px]">
            Done ({done.length})
          </summary>
          {done.map((t) => (
            <TaskRowView key={t.id} task={t} showAssignee={showAssignee} />
          ))}
        </details>
      )}
    </div>
  )
}

function MyTasksCard() {
  const { data: currentMember } = useCurrentMember()
  const { data, isLoading } = useMyTasks(currentMember?.id)

  return (
    <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-[8px]">
          <CheckSquare size={16} strokeWidth={2.25} className="text-ink-muted" />
          My tasks
        </CardTitle>
        <AddTaskForm defaultAssigneeId={currentMember?.id ?? ''} />
      </CardHeader>
      <CardContent className="p-[16px_18px]">
        {isLoading && <Skeleton className="h-[100px] w-full" />}
        {!isLoading && <TaskList tasks={data ?? []} />}
      </CardContent>
    </Card>
  )
}

function TeamTasksCard() {
  const { data, isLoading } = useTeamTasks()
  const [assigneeFilter, setAssigneeFilter] = React.useState('')
  const { data: teamMembers } = useTeamMembers()

  const filtered = assigneeFilter ? (data ?? []).filter((t) => t.assigneeId === assigneeFilter) : data ?? []

  return (
    <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-[8px]">
          <Users size={16} strokeWidth={2.25} className="text-ink-muted" />
          Team tasks
        </CardTitle>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1 bg-surface"
        >
          <option value="">Everyone</option>
          {(teamMembers ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="p-[16px_18px]">
        {isLoading && <Skeleton className="h-[140px] w-full" />}
        {!isLoading && <TaskList tasks={filtered} showAssignee />}
      </CardContent>
    </Card>
  )
}

export function TasksPage() {
  const { data: currentMember } = useCurrentMember()
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Discrete to-dos, assignable to anyone
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Tasks</h1>
      </div>

      <MyTasksCard />
      {isAdminOrManager && <TeamTasksCard />}
    </div>
  )
}
