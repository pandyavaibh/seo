import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MemberRole, TaskStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface WorkspaceTask {
  id: string
  label: string
  status: TaskStatus
  ownerId: string | null
  ownerName: string | null
  estimateHours: number | null
  dueOn: string | null
  loggedHours: number
}

export interface ProjectWorkspace {
  id: string
  name: string
  accountId: string | null
  accountName: string | null
  projectType: string | null
  stage: string | null
  dueOn: string | null
  weeklyHours: number | null
  linkTarget: number
  billingCycle: string
  renewalDay: number | null
  trafficGoalClicks: number | null
  conversionsGoal: number | null
  team: { assignmentId: string; id: string; name: string; role: MemberRole; weeklyHours: number }[]
  tasks: WorkspaceTask[]
  checklist: { done: number; total: number }
  linksLiveThisMonth: number
  hoursThisMonth: number
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function useProjectWorkspace(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-workspace', projectId],
    queryFn: async (): Promise<ProjectWorkspace> => {
      const month = currentMonthKey()
      const { start, end } = currentMonthRange()

      const [
        projectRes,
        assignmentsRes,
        tasksRes,
        entriesRes,
        templateRes,
        checklistRunsRes,
        offpageRes,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'id, name, account_id, project_type, stage, due_on, weekly_hours, link_target, billing_cycle, renewal_day, traffic_goal_clicks, conversions_goal, accounts(name)',
          )
          .eq('id', projectId!)
          .single(),
        supabase
          .from('assignments')
          .select('id, member_id, weekly_hours, team_members(id, name, role)')
          .eq('project_id', projectId!),
        supabase
          .from('tasks')
          .select('id, label, status, owner_id, estimate_hours, due_on, team_members(name)')
          .eq('project_id', projectId!)
          .order('created_at'),
        supabase
          .from('time_entries')
          .select('task_id, hours, worked_on')
          .eq('project_id', projectId!),
        supabase.from('checklist_template_items').select('id').eq('active', true),
        supabase
          .from('checklist_runs')
          .select('template_item_id, status')
          .eq('project_id', projectId!)
          .eq('month', month),
        supabase
          .from('offpage_activity_entries')
          .select('count')
          .eq('project_id', projectId!)
          .gte('entry_date', start)
          .lt('entry_date', end),
      ])

      if (projectRes.error) throw new Error(projectRes.error.message)
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      if (tasksRes.error) throw new Error(tasksRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)
      if (templateRes.error) throw new Error(templateRes.error.message)
      if (checklistRunsRes.error) throw new Error(checklistRunsRes.error.message)
      if (offpageRes.error) throw new Error(offpageRes.error.message)

      const p = projectRes.data

      const loggedByTask = new Map<string, number>()
      let hoursThisMonth = 0
      for (const e of entriesRes.data ?? []) {
        if (e.task_id) {
          loggedByTask.set(e.task_id, (loggedByTask.get(e.task_id) ?? 0) + Number(e.hours))
        }
        if (e.worked_on >= start && e.worked_on < end) {
          hoursThisMonth += Number(e.hours)
        }
      }

      const doneItemIds = new Set(
        (checklistRunsRes.data ?? []).filter((r) => r.status === 'done').map((r) => r.template_item_id),
      )

      return {
        id: p.id,
        name: p.name,
        accountId: p.account_id,
        accountName: p.accounts?.name ?? null,
        projectType: p.project_type,
        stage: p.stage,
        dueOn: p.due_on,
        weeklyHours: p.weekly_hours,
        linkTarget: p.link_target,
        billingCycle: p.billing_cycle,
        renewalDay: p.renewal_day,
        trafficGoalClicks: p.traffic_goal_clicks,
        conversionsGoal: p.conversions_goal,
        team: (assignmentsRes.data ?? [])
          .filter((a) => a.team_members != null)
          .map((a) => ({
            assignmentId: a.id,
            id: a.team_members!.id,
            name: a.team_members!.name,
            role: a.team_members!.role,
            weeklyHours: Number(a.weekly_hours),
          })),
        tasks: (tasksRes.data ?? []).map((t) => ({
          id: t.id,
          label: t.label,
          status: t.status,
          ownerId: t.owner_id,
          ownerName: t.team_members?.name ?? null,
          estimateHours: t.estimate_hours,
          dueOn: t.due_on,
          loggedHours: loggedByTask.get(t.id) ?? 0,
        })),
        checklist: {
          done: doneItemIds.size,
          total: (templateRes.data ?? []).length,
        },
        linksLiveThisMonth: (offpageRes.data ?? []).reduce((s, r) => s + r.count, 0),
        hoursThisMonth,
      }
    },
    enabled: !!projectId,
  })
}

export function useAddTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      label: string
      ownerId: string | null
      estimateHours: number | null
      dueOn: string | null
    }) => {
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        label: input.label,
        owner_id: input.ownerId,
        estimate_hours: input.estimateHours,
        due_on: input.dueOn,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useToggleTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; done: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: (input.done ? 'done' : 'todo') as TaskStatus,
          completed_at: input.done ? new Date().toISOString() : null,
        })
        .eq('id', input.taskId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useDeleteProject(projectId: string, accountId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (accountId) queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })
}

export function useAddAssignment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { memberId: string; weeklyHours: number }) => {
      const { error } = await supabase.from('assignments').insert({
        project_id: projectId,
        member_id: input.memberId,
        weekly_hours: input.weeklyHours,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useRemoveAssignment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useQuickLogHour(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; taskLabel: string; memberId: string }) => {
      const { error } = await supabase.from('time_entries').insert({
        project_id: projectId,
        task_id: input.taskId,
        member_id: input.memberId,
        hours: 1,
        note: input.taskLabel,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}
