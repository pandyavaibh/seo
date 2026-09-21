import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface PortalCommentRow {
  id: string
  body: string
  authorId: string | null
  authorName: string | null
  createdAt: string
}

export function usePortalComments(accountId: string | undefined) {
  return useQuery({
    queryKey: ['portal-comments', accountId],
    queryFn: async (): Promise<PortalCommentRow[]> => {
      const { data, error } = await supabase
        .from('portal_comments')
        .select('id, body, author_id, created_at, team_members(name)')
        .eq('account_id', accountId!)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        authorId: c.author_id,
        authorName: c.team_members?.name ?? null,
        createdAt: c.created_at,
      }))
    },
    enabled: !!accountId,
  })
}

export function useAddPortalComment(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { body: string; authorId: string | null }) => {
      const { error } = await supabase.from('portal_comments').insert({
        account_id: accountId,
        body: input.body.trim(),
        author_id: input.authorId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-comments', accountId] })
    },
  })
}

export function useDeletePortalComment(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portal_comments').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-comments', accountId] })
    },
  })
}
