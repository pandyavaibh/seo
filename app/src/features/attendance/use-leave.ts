import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type LeaveKind = 'leave' | 'holiday' | 'sick'

export interface LeaveEntry {
  id: string
  memberId: string
  memberName: string
  startsOn: string
  endsOn: string
  kind: LeaveKind
  note: string | null
}

// Everyone's leave, most recent first — "who's out" is meant to be
// visible to the whole team, same as the RLS read policy allows.
export function useLeave() {
  return useQuery({
    queryKey: ['leave'],
    queryFn: async (): Promise<LeaveEntry[]> => {
      const { data, error } = await supabase
        .from('member_leave')
        .select('id, member_id, starts_on, ends_on, kind, note, team_members(name)')
        .order('starts_on', { ascending: false })
        .limit(200)
      if (error) throw new Error(error.message)
      return (data ?? []).map((l) => ({
        id: l.id,
        memberId: l.member_id,
        memberName: l.team_members?.name ?? 'Unknown',
        startsOn: l.starts_on,
        endsOn: l.ends_on,
        kind: (l.kind ?? 'leave') as LeaveKind,
        note: l.note,
      }))
    },
  })
}

export interface NewLeaveInput {
  memberId: string
  startsOn: string
  endsOn: string
  kind: LeaveKind
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
