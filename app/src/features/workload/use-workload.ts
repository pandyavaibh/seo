import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface WorkloadRow {
  memberId: string
  name: string
  capacityHours: number | null
  assignedHours: number
  loggedHoursThisWeek: number
  // Assigned ÷ capacity, as a percent — null when capacity isn't set yet,
  // so the UI can say "not set" rather than implying 0 capacity.
  utilizationPct: number | null
}

function startOfWeekIso() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  return monday.toISOString().slice(0, 10)
}

export function useWorkload() {
  return useQuery({
    queryKey: ['workload'],
    queryFn: async (): Promise<WorkloadRow[]> => {
      const weekStart = startOfWeekIso()
      const today = new Date().toISOString().slice(0, 10)

      const [membersRes, assignmentsRes, entriesRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('id, name, weekly_capacity_hours')
          .eq('active', true)
          .order('name'),
        supabase.from('assignments').select('member_id, weekly_hours, projects(status)'),
        supabase
          .from('time_entries')
          .select('member_id, hours')
          .gte('worked_on', weekStart)
          .lte('worked_on', today),
      ])
      if (membersRes.error) throw new Error(membersRes.error.message)
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)

      const assignedByMember = new Map<string, number>()
      for (const a of assignmentsRes.data ?? []) {
        if (a.projects?.status !== 'active') continue
        assignedByMember.set(
          a.member_id,
          (assignedByMember.get(a.member_id) ?? 0) + Number(a.weekly_hours ?? 0),
        )
      }

      const loggedByMember = new Map<string, number>()
      for (const e of entriesRes.data ?? []) {
        loggedByMember.set(e.member_id, (loggedByMember.get(e.member_id) ?? 0) + Number(e.hours))
      }

      return (membersRes.data ?? []).map((m) => {
        const assignedHours = assignedByMember.get(m.id) ?? 0
        const capacityHours = m.weekly_capacity_hours
        return {
          memberId: m.id,
          name: m.name,
          capacityHours,
          assignedHours,
          loggedHoursThisWeek: loggedByMember.get(m.id) ?? 0,
          utilizationPct:
            capacityHours != null && capacityHours > 0
              ? Math.round((assignedHours / capacityHours) * 100)
              : null,
        }
      })
    },
  })
}

export function useSetMemberCapacity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { memberId: string; weeklyCapacityHours: number | null }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ weekly_capacity_hours: input.weeklyCapacityHours })
        .eq('id', input.memberId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}
