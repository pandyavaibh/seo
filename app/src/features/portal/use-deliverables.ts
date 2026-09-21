import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface DeliverableRow {
  id: string
  projectId: string | null
  title: string
  url: string | null
  deliveredOn: string
}

export function useDeliverables(accountId: string | undefined) {
  return useQuery({
    queryKey: ['deliverables', accountId],
    queryFn: async (): Promise<DeliverableRow[]> => {
      const { data, error } = await supabase
        .from('deliverables')
        .select('id, project_id, title, url, delivered_on')
        .eq('account_id', accountId!)
        .order('delivered_on', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((d) => ({
        id: d.id,
        projectId: d.project_id,
        title: d.title,
        url: d.url,
        deliveredOn: d.delivered_on,
      }))
    },
    enabled: !!accountId,
  })
}

export function useAddDeliverable(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; url: string; deliveredOn: string }) => {
      const { error } = await supabase.from('deliverables').insert({
        account_id: accountId,
        title: input.title.trim(),
        url: input.url.trim() || null,
        delivered_on: input.deliveredOn,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', accountId] })
    },
  })
}

export function useDeleteDeliverable(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deliverables').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', accountId] })
    },
  })
}
