import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface CustomGoal {
  id: string
  label: string
  targetValue: number | null
  currentValue: number | null
  unit: string | null
}

export function useProjectGoals(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-goals', projectId],
    queryFn: async (): Promise<CustomGoal[]> => {
      const { data, error } = await supabase
        .from('project_goals')
        .select('id, label, target_value, current_value, unit')
        .eq('project_id', projectId!)
        .order('created_at')
      if (error) throw new Error(error.message)
      return (data ?? []).map((g) => ({
        id: g.id,
        label: g.label,
        targetValue: g.target_value,
        currentValue: g.current_value,
        unit: g.unit,
      }))
    },
    enabled: !!projectId,
  })
}

export interface NewGoalInput {
  label: string
  targetValue: string
  currentValue: string
  unit: string
}

export function useCreateGoal(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewGoalInput) => {
      const { error } = await supabase.from('project_goals').insert({
        project_id: projectId,
        label: input.label.trim(),
        target_value: input.targetValue ? Number(input.targetValue) : null,
        current_value: input.currentValue ? Number(input.currentValue) : null,
        unit: input.unit.trim() || null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] })
    },
  })
}

export function useUpdateGoalProgress(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; currentValue: number | null }) => {
      const { error } = await supabase
        .from('project_goals')
        .update({ current_value: input.currentValue })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] })
    },
  })
}

export function useDeleteGoal(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_goals').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] })
    },
  })
}

export function useUpdateTrafficGoals(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { trafficGoalClicks: number | null; conversionsGoal: number | null }) => {
      const { error } = await supabase
        .from('projects')
        .update({
          traffic_goal_clicks: input.trafficGoalClicks,
          conversions_goal: input.conversionsGoal,
        })
        .eq('id', projectId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}
