import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface KeywordMatrixRow {
  id: string
  phrase: string
  targetUrl: string | null
  targetRank: number | null
  searchVolume: number | null
  latestRank: number | null
  previousRank: number | null
  ranksByDate: Record<string, number | null>
}

export interface KeywordStats {
  tracked: number
  averagePosition: number | null
  top3: number
  top10: number
  top30: number
}

export interface KeywordsMatrixData {
  dates: string[]
  rows: KeywordMatrixRow[]
  stats: KeywordStats
}

export function useKeywords(projectId: string | undefined) {
  return useQuery({
    queryKey: ['keywords', projectId],
    queryFn: async (): Promise<KeywordsMatrixData> => {
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
      const dateSet = new Set<string>()
      for (const c of checksRes.data ?? []) {
        const list = checksByKeyword.get(c.keyword_id) ?? []
        list.push(c)
        checksByKeyword.set(c.keyword_id, list)
        dateSet.add(c.checked_on)
      }
      const dates = Array.from(dateSet).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

      const rows: KeywordMatrixRow[] = (keywordsRes.data ?? []).map((k) => {
        const checks = checksByKeyword.get(k.id) ?? []
        const ranksByDate: Record<string, number | null> = {}
        for (const c of checks) ranksByDate[c.checked_on] = c.rank
        return {
          id: k.id,
          phrase: k.phrase,
          targetUrl: k.target_url,
          targetRank: k.target_rank,
          searchVolume: k.search_volume,
          latestRank: checks[0]?.rank ?? null,
          previousRank: checks[1]?.rank ?? null,
          ranksByDate,
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

      return { dates, rows, stats }
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

// Logs (or corrects) a whole check-date column at once — a staff member
// picks a date, fills in a rank per keyword, and saves them all together,
// matching how the team works through the spreadsheet on their check day.
// Upserts on (keyword_id, checked_on): re-logging the same date replaces
// that day's cell instead of stacking a duplicate entry.
export function useLogRanksForDate(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      checkedOn: string
      entries: { keywordId: string; rank: number }[]
      checkedBy: string | null
    }) => {
      if (input.entries.length === 0) return
      const rows = input.entries.map((e) => ({
        project_id: projectId,
        keyword_id: e.keywordId,
        checked_on: input.checkedOn,
        rank: e.rank,
        checked_by: input.checkedBy,
      }))
      const { error } = await supabase
        .from('keyword_checks')
        .upsert(rows, { onConflict: 'keyword_id,checked_on' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}
