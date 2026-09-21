import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface UtmLinkRow {
  id: string
  accountId: string | null
  accountName: string | null
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string | null
  content: string | null
  builtUrl: string
  createdAt: string
}

export function useUtmLinks() {
  return useQuery({
    queryKey: ['utm-links'],
    queryFn: async (): Promise<UtmLinkRow[]> => {
      const { data, error } = await supabase
        .from('utm_links')
        .select('id, account_id, base_url, source, medium, campaign, term, content, built_url, created_at, accounts(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return (data ?? []).map((l) => ({
        id: l.id,
        accountId: l.account_id,
        accountName: l.accounts?.name ?? null,
        baseUrl: l.base_url,
        source: l.source,
        medium: l.medium,
        campaign: l.campaign,
        term: l.term,
        content: l.content,
        builtUrl: l.built_url,
        createdAt: l.created_at,
      }))
    },
  })
}

export interface NewUtmLinkInput {
  accountId: string | null
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  builtUrl: string
  createdBy: string | null
}

export function useCreateUtmLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewUtmLinkInput) => {
      const { error } = await supabase.from('utm_links').insert({
        account_id: input.accountId,
        base_url: input.baseUrl,
        source: input.source,
        medium: input.medium,
        campaign: input.campaign,
        term: input.term || null,
        content: input.content || null,
        built_url: input.builtUrl,
        created_by: input.createdBy,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-links'] })
    },
  })
}

export function useDeleteUtmLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('utm_links').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-links'] })
    },
  })
}
