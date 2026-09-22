import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface KeywordRow {
  id: string
  phrase: string
  targetUrl: string | null
  targetRank: number | null
  searchVolume: number | null
  latestRank: number | null
  latestCheckedOn: string | null
  previousRank: number | null
}

export interface KeywordStats {
  tracked: number
  averagePosition: number | null
  top3: number
  top10: number
  top30: number
}

export interface KeywordsData {
  rows: KeywordRow[]
  stats: KeywordStats
}

export function useKeywords(projectId: string | undefined) {
  return useQuery({
    queryKey: ['keywords', projectId],
    queryFn: async (): Promise<KeywordsData> => {
      const [keywordsRes, checksRes] = await Promise.all([
        supabase
          .from('keywords')
          .select('id, phrase, target_url, target_rank, search_volume')
          .eq('project_id', projectId!)
          .eq('archived', false)
          .order('phrase'),
        supabase
          .from('keyword_checks')
          .select('keyword_id, rank, checked_on')
          .eq('project_id', projectId!)
          .order('checked_on', { ascending: false }),
      ])

      if (keywordsRes.error) throw new Error(keywordsRes.error.message)
      if (checksRes.error) throw new Error(checksRes.error.message)

      const checksByKeyword = new Map<string, { rank: number | null; checked_on: string }[]>()
      for (const c of checksRes.data ?? []) {
        const list = checksByKeyword.get(c.keyword_id) ?? []
        list.push(c)
        checksByKeyword.set(c.keyword_id, list)
      }

      const rows: KeywordRow[] = (keywordsRes.data ?? []).map((k) => {
        const checks = checksByKeyword.get(k.id) ?? []
        return {
          id: k.id,
          phrase: k.phrase,
          targetUrl: k.target_url,
          targetRank: k.target_rank,
          searchVolume: k.search_volume,
          latestRank: checks[0]?.rank ?? null,
          latestCheckedOn: checks[0]?.checked_on ?? null,
          previousRank: checks[1]?.rank ?? null,
        }
      })

      const ranked = rows.filter((r) => r.latestRank != null).map((r) => r.latestRank!)
      const stats: KeywordStats = {
        tracked: rows.length,
        averagePosition:
          ranked.length > 0 ? ranked.reduce((s, r) => s + r, 0) / ranked.length : null,
        top3: ranked.filter((r) => r <= 3).length,
        top10: ranked.filter((r) => r <= 10).length,
        top30: ranked.filter((r) => r <= 30).length,
      }

      return { rows, stats }
    },
    enabled: !!projectId,
  })
}

export function useAddKeywords(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (phrases: string[]) => {
      const rows = phrases.map((phrase) => ({ project_id: projectId, phrase }))
      if (rows.length === 0) return
      const { error } = await supabase.from('keywords').insert(rows)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}

export function useSetKeywordTarget(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keywordId: string; targetRank: number | null }) => {
      const { error } = await supabase
        .from('keywords')
        .update({ target_rank: input.targetRank })
        .eq('id', input.keywordId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}

export function useSetSearchVolume(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keywordId: string; searchVolume: number | null }) => {
      const { error } = await supabase
        .from('keywords')
        .update({ search_volume: input.searchVolume })
        .eq('id', input.keywordId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}

export function useLogRank(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keywordId: string; rank: number; checkedBy: string | null }) => {
      const { error } = await supabase.from('keyword_checks').insert({
        project_id: projectId,
        keyword_id: input.keywordId,
        rank: input.rank,
        checked_by: input.checkedBy,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}
