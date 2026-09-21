import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface TimeEntry {
  id: string
  hours: number
  workedOn: string
  note: string
  memberId: string
  memberName: string
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function useTimeEntries(projectId: string) {
  const { start, end } = currentMonthRange()
  return useQuery({
    queryKey: ['time-entries', projectId, start],
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, hours, worked_on, note, member_id, team_members(name)')
        .eq('project_id', projectId)
        .gte('worked_on', start)
        .lt('worked_on', end)
        .order('worked_on', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        id: e.id,
        hours: Number(e.hours),
        workedOn: e.worked_on,
        note: e.note,
        memberId: e.member_id,
        memberName: e.team_members?.name ?? 'Unknown',
      }))
    },
  })
}

export function useLogTimeEntry(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      memberId: string
      hours: number
      note: string
      workedOn: string
    }) => {
      const { error } = await supabase.from('time_entries').insert({
        project_id: projectId,
        member_id: input.memberId,
        hours: input.hours,
        note: input.note,
        worked_on: input.workedOn,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId] })
    },
  })
}
