import { useQuery } from '@tanstack/react-query'

import { currentMonthKey } from '@/features/checklist/use-checklist'
import { supabase } from '@/lib/supabase'

export interface PerformanceRow {
  memberId: string
  name: string
  hoursLoggedThisMonth: number
  tasksCompletedThisMonth: number
  tasksOverdue: number
  checklistItemsClosedThisMonth: number
}

export interface WeeklyHours {
  weekStart: string
  hours: number
}

export interface PerformanceData {
  rows: PerformanceRow[]
  weeklyTeamHours: WeeklyHours[]
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

// Monday of the week containing `d`.
function weekStartOf(d: Date) {
  const day = d.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday)
  return monday.toISOString().slice(0, 10)
}

export function usePerformance() {
  return useQuery({
    queryKey: ['performance'],
    queryFn: async (): Promise<PerformanceData> => {
      const { start, end } = currentMonthRange()
      const today = new Date().toISOString().slice(0, 10)
      const month = currentMonthKey()
      const trendStart = new Date(Date.now() - 56 * 86400000).toISOString().slice(0, 10)

      const [membersRes, monthEntriesRes, trendEntriesRes, tasksRes, runsRes] = await Promise.all([
        supabase.from('team_members').select('id, name').eq('active', true).order('name'),
        supabase.from('time_entries').select('member_id, hours').gte('worked_on', start).lte('worked_on', end),
        supabase.from('time_entries').select('worked_on, hours').gte('worked_on', trendStart).lte('worked_on', today),
        supabase.from('tasks').select('assignee_id, status, due_on, completed_at'),
        supabase
          .from('checklist_runs')
          .select('done_by')
          .eq('month', month)
          .eq('status', 'done'),
      ])
      if (membersRes.error) throw new Error(membersRes.error.message)
      if (monthEntriesRes.error) throw new Error(monthEntriesRes.error.message)
      if (trendEntriesRes.error) throw new Error(trendEntriesRes.error.message)
      if (tasksRes.error) throw new Error(tasksRes.error.message)
      if (runsRes.error) throw new Error(runsRes.error.message)

      const hoursByMember = new Map<string, number>()
      for (const e of monthEntriesRes.data ?? []) {
        hoursByMember.set(e.member_id, (hoursByMember.get(e.member_id) ?? 0) + Number(e.hours))
      }

      const completedByMember = new Map<string, number>()
      const overdueByMember = new Map<string, number>()
      for (const t of tasksRes.data ?? []) {
        if (!t.assignee_id) continue
        if (t.status === 'done' && t.completed_at && t.completed_at >= start && t.completed_at <= `${end}T23:59:59`) {
          completedByMember.set(t.assignee_id, (completedByMember.get(t.assignee_id) ?? 0) + 1)
        }
        if (t.status !== 'done' && t.due_on && t.due_on < today) {
          overdueByMember.set(t.assignee_id, (overdueByMember.get(t.assignee_id) ?? 0) + 1)
        }
      }

      const closedByMember = new Map<string, number>()
      for (const r of runsRes.data ?? []) {
        if (!r.done_by) continue
        closedByMember.set(r.done_by, (closedByMember.get(r.done_by) ?? 0) + 1)
      }

      const rows: PerformanceRow[] = (membersRes.data ?? []).map((m) => ({
        memberId: m.id,
        name: m.name,
        hoursLoggedThisMonth: hoursByMember.get(m.id) ?? 0,
        tasksCompletedThisMonth: completedByMember.get(m.id) ?? 0,
        tasksOverdue: overdueByMember.get(m.id) ?? 0,
        checklistItemsClosedThisMonth: closedByMember.get(m.id) ?? 0,
      }))

      const weekTotals = new Map<string, number>()
      for (const e of trendEntriesRes.data ?? []) {
        const wk = weekStartOf(new Date(`${e.worked_on}T00:00:00`))
        weekTotals.set(wk, (weekTotals.get(wk) ?? 0) + Number(e.hours))
      }
      const weeklyTeamHours: WeeklyHours[] = Array.from(weekTotals, ([weekStart, hours]) => ({ weekStart, hours })).sort(
        (a, b) => (a.weekStart < b.weekStart ? -1 : 1),
      )

      return { rows, weeklyTeamHours }
    },
  })
}
