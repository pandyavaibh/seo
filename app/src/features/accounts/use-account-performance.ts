import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface AccountPerformance {
  gscConnected: boolean
  organicClicks28d: number | null
  ga4Connected: boolean
  conversions28d: number | null
  keywordsTop10: number | null
  linksLiveThisMonth: number
  hoursLoggedThisMonth: number
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function useAccountPerformance(accountId: string | undefined) {
  return useQuery({
    queryKey: ['account-performance', accountId],
    queryFn: async (): Promise<AccountPerformance> => {
      const month = currentMonthKey()
      const { start, end } = currentMonthRange()

      const [connRes, snapshotRes, projectsRes] = await Promise.all([
        supabase
          .from('search_connections')
          .select('source, status')
          .eq('account_id', accountId!),
        supabase
          .from('metric_snapshots')
          .select('source, snapshot_date, metric_key, value')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(400),
        supabase.from('projects').select('id').eq('account_id', accountId!),
      ])

      if (connRes.error) throw new Error(connRes.error.message)
      if (snapshotRes.error) throw new Error(snapshotRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)

      const gscConn = connRes.data?.find((c) => c.source === 'gsc')
      const ga4Conn = connRes.data?.find((c) => c.source === 'ga4')

      const gscClicksByDate = new Map<string, number>()
      const ga4ConversionsByDate = new Map<string, number>()
      for (const row of snapshotRes.data ?? []) {
        if (row.source === 'gsc' && row.metric_key === 'clicks') {
          gscClicksByDate.set(row.snapshot_date, row.value)
        }
        if (row.source === 'ga4' && row.metric_key === 'conversions') {
          ga4ConversionsByDate.set(row.snapshot_date, row.value)
        }
      }
      const last28 = (m: Map<string, number>) =>
        Array.from(m.values()).slice(0, 28).reduce((s, v) => s + v, 0)

      const projectIds = (projectsRes.data ?? []).map((p) => p.id)

      let keywordsTop10: number | null = null
      let linksLiveThisMonth = 0
      let hoursLoggedThisMonth = 0

      if (projectIds.length > 0) {
        const [keywordsRes, checksRes, offpageRes, entriesRes] = await Promise.all([
          supabase.from('keywords').select('id').in('project_id', projectIds).eq('archived', false),
          supabase
            .from('keyword_checks')
            .select('keyword_id, rank, checked_on')
            .in('project_id', projectIds)
            .order('checked_on', { ascending: false }),
          supabase
            .from('offpage_runs')
            .select('count')
            .in('project_id', projectIds)
            .eq('month', month),
          supabase
            .from('time_entries')
            .select('hours, worked_on')
            .in('project_id', projectIds),
        ])

        if (keywordsRes.error) throw new Error(keywordsRes.error.message)
        if (checksRes.error) throw new Error(checksRes.error.message)
        if (offpageRes.error) throw new Error(offpageRes.error.message)
        if (entriesRes.error) throw new Error(entriesRes.error.message)

        const latestRankByKeyword = new Map<string, number | null>()
        for (const c of checksRes.data ?? []) {
          if (!latestRankByKeyword.has(c.keyword_id)) {
            latestRankByKeyword.set(c.keyword_id, c.rank)
          }
        }
        if ((keywordsRes.data ?? []).length > 0) {
          keywordsTop10 = 0
          for (const k of keywordsRes.data ?? []) {
            const rank = latestRankByKeyword.get(k.id)
            if (rank != null && rank <= 10) keywordsTop10 += 1
          }
        }

        linksLiveThisMonth = (offpageRes.data ?? []).reduce((s, r) => s + r.count, 0)
        hoursLoggedThisMonth = (entriesRes.data ?? [])
          .filter((e) => e.worked_on >= start && e.worked_on < end)
          .reduce((s, e) => s + Number(e.hours), 0)
      }

      return {
        gscConnected: gscConn?.status === 'granted',
        organicClicks28d: gscConn?.status === 'granted' ? last28(gscClicksByDate) : null,
        ga4Connected: ga4Conn?.status === 'granted',
        conversions28d: ga4Conn?.status === 'granted' ? last28(ga4ConversionsByDate) : null,
        keywordsTop10,
        linksLiveThisMonth,
        hoursLoggedThisMonth,
      }
    },
    enabled: !!accountId,
  })
}
