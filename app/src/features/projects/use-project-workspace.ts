import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

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
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })
}
