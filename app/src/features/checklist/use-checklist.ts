import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ChecklistPriority, ChecklistStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface ChecklistItem {
  id: string
  label: string
  priority: ChecklistPriority | null
  referenceTag: string | null
  status: ChecklistStatus
  note: string | null
}

export interface ChecklistCategory {
  name: string
  items: ChecklistItem[]
  done: number
  total: number
}

export interface ChecklistData {
  categories: ChecklistCategory[]
  totals: { done: number; inProgress: number; toDo: number; na: number; total: number }
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export { currentMonthKey }

export function useChecklist(projectId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['checklist', projectId, month],
    queryFn: async (): Promise<ChecklistData> => {
      const [itemsRes, runsRes] = await Promise.all([
        supabase
          .from('checklist_template_items')
          .select('id, label, category, priority, reference_tag, sort_order')
          .eq('active', true)
          .order('sort_order'),
        supabase
          .from('checklist_runs')
          .select('template_item_id, status, note')
          .eq('project_id', projectId!)
          .eq('month', month),
      ])
      if (itemsRes.error) throw new Error(itemsRes.error.message)
      if (runsRes.error) throw new Error(runsRes.error.message)

      const runByItem = new Map(
        (runsRes.data ?? []).map((r) => [r.template_item_id, { status: r.status, note: r.note }]),
      )

      const categoryMap = new Map<string, ChecklistItem[]>()
      for (const item of itemsRes.data ?? []) {
        const run = runByItem.get(item.id)
        const categoryName = item.category ?? 'Other'
        const list = categoryMap.get(categoryName) ?? []
        list.push({
          id: item.id,
          label: item.label,
          priority: item.priority,
          referenceTag: item.reference_tag,
          status: run?.status ?? 'to_do',
          note: run?.note ?? null,
        })
        categoryMap.set(categoryName, list)
      }

      const categories: ChecklistCategory[] = Array.from(categoryMap, ([name, items]) => ({
        name,
        items,
        done: items.filter((i) => i.status === 'done').length,
        total: items.length,
      }))

      const totals = { done: 0, inProgress: 0, toDo: 0, na: 0, total: 0 }
      for (const cat of categories) {
        for (const item of cat.items) {
          totals.total += 1
          if (item.status === 'done') totals.done += 1
          else if (item.status === 'in_progress') totals.inProgress += 1
          else if (item.status === 'na') totals.na += 1
          else totals.toDo += 1
        }
      }

      return { categories, totals }
    },
    enabled: !!projectId,
  })
}

export function useSetChecklistStatus(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { templateItemId: string; status: ChecklistStatus; doneBy: string | null }) => {
      const { error } = await supabase.from('checklist_runs').upsert(
        {
          project_id: projectId,
          template_item_id: input.templateItemId,
          month,
          status: input.status,
          done_by: input.status === 'done' ? input.doneBy : null,
          done_at: input.status === 'done' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,template_item_id,month' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', projectId, month] })
      queryClient.invalidateQueries({ queryKey: ['project-workspace', projectId] })
    },
  })
}

export function useSetChecklistNote(projectId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { templateItemId: string; note: string }) => {
      const { error } = await supabase.from('checklist_runs').upsert(
        {
          project_id: projectId,
          template_item_id: input.templateItemId,
          month,
          note: input.note.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,template_item_id,month', ignoreDuplicates: false },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', projectId, month] })
    },
  })
}
