import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface AttendanceEntry {
  id: string
  memberId: string
  memberName: string
  workDate: string
  punchIn: string
  punchOut: string | null
  note: string | null
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Hours between punch in/out, or elapsed so far if still punched in —
// null once neither can be computed (shouldn't happen, punch_in is
// always set).
export function hoursWorked(entry: AttendanceEntry): number {
  const start = new Date(entry.punchIn).getTime()
  const end = entry.punchOut ? new Date(entry.punchOut).getTime() : Date.now()
  return Math.round(((end - start) / 3_600_000) * 100) / 100
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async (): Promise<AttendanceEntry[]> => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('id, member_id, work_date, punch_in, punch_out, note, team_members(name)')
        .eq('work_date', todayIso())
        .order('punch_in')
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        id: e.id,
        memberId: e.member_id,
        memberName: e.team_members?.name ?? 'Unknown',
        workDate: e.work_date,
        punchIn: e.punch_in,
        punchOut: e.punch_out,
        note: e.note,
      }))
    },
  })
}

// A member's own recent attendance — most recent first, capped so the
// page doesn't grow unbounded.
export function useMyRecentAttendance(memberId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'recent', memberId],
    queryFn: async (): Promise<AttendanceEntry[]> => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('id, member_id, work_date, punch_in, punch_out, note, team_members(name)')
        .eq('member_id', memberId!)
        .order('work_date', { ascending: false })
        .limit(14)
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        id: e.id,
        memberId: e.member_id,
        memberName: e.team_members?.name ?? 'Unknown',
        workDate: e.work_date,
        punchIn: e.punch_in,
        punchOut: e.punch_out,
        note: e.note,
      }))
    },
    enabled: !!memberId,
  })
}

export function usePunchIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('attendance_entries').insert({
        member_id: memberId,
        work_date: todayIso(),
        punch_in: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function usePunchOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('attendance_entries')
        .update({ punch_out: new Date().toISOString() })
        .eq('id', entryId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}
