import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface OffpageEntryRow {
  id: string
  entryDate: string
  count: number
  note: string | null
  createdByName: string | null
  cumulativeDone: number
  remainingAfter: number
}

export interface OffpageActivityRow {
  activityType: string
  targetMin: number
  targetMax: number
  done: number
  remaining: number
  entries: OffpageEntryRow[]
}

export interface OffpageData {
  linkTarget: number
  doneThisMonth: number
  activities: OffpageActivityRow[]
}

// 'YYYY-MM' -> the [start, end) date range entry_date is compared
// against, so a running total only ever sums entries within the
// month being viewed (matches the old offpage_runs's per-month scope).
function monthDateRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 1)) }
}

export function useOffpageActivity(projectId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['offpage-activity', projectId, month],
    queryFn: async (): Promise<OffpageData> => {
      const { start, end } = monthDateRange(month)
      const [projectRes, typesRes, entriesRes] = await Promise.all([
        supabase.from('projects').select('link_target').eq('id', projectId!).single(),
        supabase.from('offpage_activity_types').select('activity_type, target_min, target_max, sort_order').order('sort_order'),
        supabase
          .from('offpage_activity_entries')
          .select('id, activity_type, entry_date, count, note, team_members(name)')
          .eq('project_id', projectId!)
          .gte('entry_date', start)
          .lt('entry_date', end)
          .order('entry_date', { ascending: true }),
      ])
      if (projectRes.error) throw new Error(projectRes.error.message)
      if (typesRes.error) throw new Error(typesRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)

      const entriesByType = new Map<string, NonNullable<typeof entriesRes.data>>()
      for (const e of entriesRes.data ?? []) {
        const list = entriesByType.get(e.activity_type) ?? []
        list.push(e)
        entriesByType.set(e.activity_type, list)
      }

      const activities: OffpageActivityRow[] = (typesRes.data ?? []).map((t) => {
        let running = 0
        const entries: OffpageEntryRow[] = (entriesByType.get(t.activity_type) ?? []).map((e) => {
          running += e.count
          return {
            id: e.id,
            entryDate: e.entry_date,
            count: e.count,
            note: e.note,
            createdByName: e.team_members?.name ?? null,
            cumulativeDone: running,
            remainingAfter: Math.max(0, t.target_max - running),
          }
        })
        return {
          activityType: t.activity_type,
          targetMin: t.target_min,
          targetMax: t.target_max,
          done: running,
          remaining: Math.max(0, t.target_max - running),
          entries,
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

export function useAddOffpageEntry(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { activityType: string; entryDate: string; count: number; note: string; createdBy: string | null }) => {
      const { error } = await supabase.from('offpage_activity_entries').insert({
        project_id: projectId,
        activity_type: input.activityType,
        entry_date: input.entryDate,
        count: input.count,
        note: input.note.trim() || null,
        created_by: input.createdBy,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offpage-activity', projectId, month] })
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useDeleteOffpageEntry(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('offpage_activity_entries').delete().eq('id', entryId)
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
