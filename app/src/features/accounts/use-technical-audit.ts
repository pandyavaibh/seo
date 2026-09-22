import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface TechnicalAuditRow {
  id: string
  url: string
  runAt: string
  performanceScore: number | null
  seoScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  lcpMs: number | null
  cls: number | null
  inpMs: number | null
  hasRobotsTxt: boolean | null
  hasSitemap: boolean | null
  error: string | null
}

export function useTechnicalAudits(accountId: string | undefined) {
  return useQuery({
    queryKey: ['technical-audits', accountId],
    queryFn: async (): Promise<TechnicalAuditRow[]> => {
      const { data, error } = await supabase
        .from('technical_audits')
        .select(
          'id, url, run_at, performance_score, seo_score, accessibility_score, best_practices_score, lcp_ms, cls, inp_ms, has_robots_txt, has_sitemap, error',
        )
        .eq('account_id', accountId!)
        .order('run_at', { ascending: false })
        .limit(10)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        id: r.id,
        url: r.url,
        runAt: r.run_at,
        performanceScore: r.performance_score,
        seoScore: r.seo_score,
        accessibilityScore: r.accessibility_score,
        bestPracticesScore: r.best_practices_score,
        lcpMs: r.lcp_ms,
        cls: r.cls,
        inpMs: r.inp_ms,
        hasRobotsTxt: r.has_robots_txt,
        hasSitemap: r.has_sitemap,
        error: r.error,
      }))
    },
    enabled: !!accountId,
  })
}

export function useRunTechnicalAudit(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('run-technical-audit', {
        body: { accountId, url },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-audits', accountId] })
    },
  })
}
