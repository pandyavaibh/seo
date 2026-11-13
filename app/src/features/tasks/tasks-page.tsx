import { CheckSquare, Users } from 'lucide-react'
import * as React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useCurrentMember } from '@/features/team/use-current-member'
import { AddTaskForm, TaskList } from '@/features/tasks/task-components'
import { useMyTasks, useTeamTasks } from '@/features/tasks/use-tasks'

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
