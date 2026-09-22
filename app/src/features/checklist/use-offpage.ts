import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface OffpageActivityRow {
  activityType: string
  targetMin: number
  targetMax: number
  done: number
  remaining: number
}

export interface OffpageData {
  linkTarget: number
  doneThisMonth: number
  activities: OffpageActivityRow[]
}

export function useOffpageActivity(projectId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['offpage-activity', projectId, month],
    queryFn: async (): Promise<OffpageData> => {
      const [projectRes, typesRes, runsRes] = await Promise.all([
        supabase.from('projects').select('link_target').eq('id', projectId!).single(),
        supabase.from('offpage_activity_types').select('activity_type, target_min, target_max, sort_order').order('sort_order'),
        supabase.from('offpage_runs').select('activity_type, count').eq('project_id', projectId!).eq('month', month),
      ])
      if (projectRes.error) throw new Error(projectRes.error.message)
      if (typesRes.error) throw new Error(typesRes.error.message)
      if (runsRes.error) throw new Error(runsRes.error.message)

      const doneByType = new Map((runsRes.data ?? []).map((r) => [r.activity_type, r.count]))
      const activities: OffpageActivityRow[] = (typesRes.data ?? []).map((t) => {
        const done = doneByType.get(t.activity_type) ?? 0
        return {
          activityType: t.activity_type,
          targetMin: t.target_min,
          targetMax: t.target_max,
          done,
          remaining: Math.max(0, t.target_max - done),
        }
      })

      return {
        linkTarget: projectRes.data?.link_target ?? 200,
        doneThisMonth: activities.reduce((s, a) => s + a.done, 0),
        activities,
      }
    },
    enabled: !!projectId,
  })
}

export function useSetOffpageCount(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { activityType: string; count: number; updatedBy: string | null }) => {
      const { error } = await supabase.from('offpage_runs').upsert(
        {
          project_id: projectId,
          month,
          activity_type: input.activityType,
          count: input.count,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,month,activity_type' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offpage-activity', projectId, month] })
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

// ---------------------------------------------------------------------
// Recurring off-page tasks
// ---------------------------------------------------------------------

export type RecurringTaskKey =
  | 'weekly_follow_up'
  | 'backlink_indexing_check'
  | 'keyword_check_1st'
  | 'keyword_check_15th'
  | 'project_status_complete'
  | 'competitor_backlink_analysis'

export interface RecurringInstance {
  key: string
  label: string
  done: boolean
}

export interface RecurringTask {
  key: RecurringTaskKey
  title: string
  description: string
  instances: RecurringInstance[]
}

function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function weekInstances(month: string): { key: string; label: string }[] {
  const total = daysInMonth(month)
  const out: { key: string; label: string }[] = []
  let start = 1
  let week = 1
  while (start <= total) {
    const end = Math.min(start + 6, total)
    out.push({ key: `wk${week}`, label: `Wk ${week} (${start}-${end})` })
    start = end + 1
    week += 1
  }
  return out
}

function fridayInstances(month: string): { key: string; label: string }[] {
  const total = daysInMonth(month)
  const [y, m] = month.split('-').map(Number)
  const out: { key: string; label: string }[] = []
  for (let day = 1; day <= total; day++) {
    const date = new Date(y, m - 1, day)
    if (date.getDay() === 5) {
      out.push({ key: `fri_${day}`, label: `Fri ${day}` })
    }
  }
  return out
}

const RECURRING_TASK_DEFS: { key: RecurringTaskKey; title: string; description: string }[] = [
  { key: 'weekly_follow_up', title: 'Weekly Project Follow-Up', description: 'Conduct a weekly review for this project — every week.' },
  { key: 'backlink_indexing_check', title: 'Backlink & Indexing Check', description: 'Check backlinks and submit for indexing — every Friday.' },
  { key: 'keyword_check_1st', title: 'Keyword Ranking Check — 1st', description: 'Check keyword rankings on the 1st of the month.' },
  { key: 'keyword_check_15th', title: 'Keyword Ranking Check — 15th', description: 'Check keyword rankings on the 15th of the month.' },
  { key: 'project_status_complete', title: 'Project Status Complete', description: 'Every project should be complete before the 25th.' },
  { key: 'competitor_backlink_analysis', title: 'Competitor Backlink Analysis', description: 'Conduct competitor backlink analysis — monthly.' },
]

export function useRecurringOffpageTasks(projectId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['offpage-recurring', projectId, month],
    queryFn: async (): Promise<RecurringTask[]> => {
      const { data, error } = await supabase
        .from('offpage_recurring_runs')
        .select('task_key, instance_key, done')
        .eq('project_id', projectId!)
        .eq('month', month)
      if (error) throw new Error(error.message)

      const doneMap = new Map((data ?? []).map((r) => [`${r.task_key}:${r.instance_key}`, r.done]))

      return RECURRING_TASK_DEFS.map((def) => {
        let instanceDefs: { key: string; label: string }[]
        if (def.key === 'weekly_follow_up') instanceDefs = weekInstances(month)
        else if (def.key === 'backlink_indexing_check') instanceDefs = fridayInstances(month)
        else instanceDefs = [{ key: 'default', label: 'Mark done' }]

        return {
          key: def.key,
          title: def.title,
          description: def.description,
          instances: instanceDefs.map((i) => ({
            key: i.key,
            label: i.label,
            done: doneMap.get(`${def.key}:${i.key}`) ?? false,
          })),
        }
      })
    },
    enabled: !!projectId,
  })
}

export function useToggleRecurringInstance(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskKey: RecurringTaskKey; instanceKey: string; done: boolean; doneBy: string | null }) => {
      const { error } = await supabase.from('offpage_recurring_runs').upsert(
        {
          project_id: projectId,
          month,
          task_key: input.taskKey,
          instance_key: input.instanceKey,
          done: input.done,
          done_by: input.done ? input.doneBy : null,
          done_at: input.done ? new Date().toISOString() : null,
        },
        { onConflict: 'project_id,month,task_key,instance_key' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offpage-recurring', projectId, month] })
    },
  })
}

export function useOffpageNote(projectId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['offpage-notes', projectId, month],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('offpage_notes')
        .select('note')
        .eq('project_id', projectId!)
        .eq('month', month)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data?.note ?? ''
    },
    enabled: !!projectId,
  })
}

export function useSetOffpageNote(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase
        .from('offpage_notes')
        .upsert({ project_id: projectId, month, note: note.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'project_id,month' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offpage-notes', projectId, month] })
    },
  })
}
