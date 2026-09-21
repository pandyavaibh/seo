import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface LeaveRow {
  id: string
  memberId: string
  memberName: string
  startsOn: string
  endsOn: string
  kind: string
  note: string | null
}

export function useLeave() {
  return useQuery({
    queryKey: ['leave'],
    queryFn: async (): Promise<LeaveRow[]> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('member_leave')
        .select('id, member_id, starts_on, ends_on, kind, note, team_members(name)')
        .gte('ends_on', today)
        .order('starts_on')
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        id: r.id,
        memberId: r.member_id,
        memberName: r.team_members?.name ?? 'Unknown',
        startsOn: r.starts_on,
        endsOn: r.ends_on,
        kind: r.kind ?? 'leave',
        note: r.note,
      }))
    },
  })
}

export interface NewLeaveInput {
  memberId: string
  startsOn: string
  endsOn: string
  kind: string
  note: string
}

export function useAddLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewLeaveInput) => {
      const { error } = await supabase.from('member_leave').insert({
        member_id: input.memberId,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        kind: input.kind,
        note: input.note.trim() || null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] })
    },
  })
}

export function useDeleteLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('member_leave').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] })
    },
  })
}
