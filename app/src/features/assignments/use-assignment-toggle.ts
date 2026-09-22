import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function useToggleAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { projectId: string; memberId: string; on: boolean }) => {
      if (input.on) {
        const { error } = await supabase
          .from('assignments')
          .delete()
          .eq('project_id', input.projectId)
          .eq('member_id', input.memberId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert({ project_id: input.projectId, member_id: input.memberId })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['project-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['capacity'] })
    },
  })
}
