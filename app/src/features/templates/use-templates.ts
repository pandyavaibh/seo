import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface TemplateTask {
  id: string
  label: string
  estimateHours: number | null
  sortOrder: number
}

export interface Template {
  id: string
  name: string
  description: string | null
  tasks: TemplateTask[]
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<Template[]> => {
      const [templatesRes, tasksRes] = await Promise.all([
        supabase.from('project_templates').select('id, name, description').order('name'),
        supabase.from('template_tasks').select('id, template_id, label, estimate_hours, sort_order').order('sort_order'),
      ])
      if (templatesRes.error) throw new Error(templatesRes.error.message)
      if (tasksRes.error) throw new Error(tasksRes.error.message)

      const tasksByTemplate = new Map<string, TemplateTask[]>()
      for (const t of tasksRes.data ?? []) {
        const list = tasksByTemplate.get(t.template_id) ?? []
        list.push({ id: t.id, label: t.label, estimateHours: t.estimate_hours, sortOrder: t.sort_order })
        tasksByTemplate.set(t.template_id, list)
      }

      return (templatesRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        tasks: tasksByTemplate.get(t.id) ?? [],
      }))
    },
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('project_templates')
        .insert({ name: input.name.trim(), description: input.description.trim() || null })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_templates').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useAddTemplateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { templateId: string; label: string; estimateHours: number | null; sortOrder: number }) => {
      const { error } = await supabase.from('template_tasks').insert({
        template_id: input.templateId,
        label: input.label.trim(),
        estimate_hours: input.estimateHours,
        sort_order: input.sortOrder,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useDeleteTemplateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('template_tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useApplyTemplate(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: tasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('label, estimate_hours')
        .eq('template_id', templateId)
        .order('sort_order')
      if (tasksError) throw new Error(tasksError.message)

      if ((tasks ?? []).length > 0) {
        const { error: insertError } = await supabase.from('tasks').insert(
          (tasks ?? []).map((t) => ({
            project_id: projectId,
            label: t.label,
            estimate_hours: t.estimate_hours,
          })),
        )
        if (insertError) throw new Error(insertError.message)
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ applied_template_id: templateId })
        .eq('id', projectId)
      if (updateError) throw new Error(updateError.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}
