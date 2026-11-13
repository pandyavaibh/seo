import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentMember } from '@/features/team/use-current-member'
import type { TaskPriority, TaskStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface TaskRow {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  dueOn: string | null
  completedAt: string | null
  createdAt: string
  assigneeId: string | null
  assigneeName: string | null
  accountId: string | null
  accountName: string | null
  projectId: string | null
  projectName: string | null
}

const SELECT = `
  id, title, notes, status, priority, due_on, completed_at, created_at,
  assignee_id, account_id, project_id,
  assignee:team_members!tasks_assignee_id_fkey(id, name),
  accounts(name),
  projects(name)
`

function toRow(t: Record<string, unknown>): TaskRow {
  const assignee = t.assignee as { id: string; name: string } | null
  const account = t.accounts as { name: string } | null
  const project = t.projects as { name: string } | null
  return {
    id: t.id as string,
    title: t.title as string,
    notes: t.notes as string | null,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    dueOn: t.due_on as string | null,
    completedAt: t.completed_at as string | null,
    createdAt: t.created_at as string,
    assigneeId: t.assignee_id as string | null,
    assigneeName: assignee?.name ?? null,
    accountId: t.account_id as string | null,
    accountName: account?.name ?? null,
    projectId: t.project_id as string | null,
    projectName: project?.name ?? null,
  }
}

// Every task assigned to the signed-in member, across every client — the
// "what do I need to do" view, open/in-progress first then done, each
// grouped by due date in the UI.
export function useMyTasks(memberId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'mine', memberId],
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(SELECT)
        .eq('assignee_id', memberId!)
        .order('status')
        .order('due_on', { nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(toRow)
    },
    enabled: !!memberId,
  })
}

// Every task across the team — admin/manager only (matches tasks_read's
// is_staff() policy plus the client-side gate every manager-facing list
// in this app already uses).
export function useTeamTasks() {
  return useQuery({
    queryKey: ['tasks', 'team'],
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(SELECT)
        .order('status')
        .order('due_on', { nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(toRow)
    },
  })
}

export interface NewTaskInput {
  title: string
  notes: string
  priority: TaskPriority
  assigneeId: string
  accountId: string
  dueOn: string
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { data: currentMember } = useCurrentMember()
  return useMutation({
    mutationFn: async (input: NewTaskInput) => {
      const { error } = await supabase.from('tasks').insert({
        title: input.title.trim(),
        notes: input.notes.trim() || null,
        priority: input.priority,
        assignee_id: input.assigneeId || null,
        account_id: input.accountId || null,
        due_on: input.dueOn || null,
        created_by: currentMember?.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: input.status,
          completed_at: input.status === 'done' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
