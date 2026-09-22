import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { generateCommentary } from '@/features/intelligence/report-commentary'
import type { ReportStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface ReportSnapshot {
  search: { clicks: number; impressions: number } | null
  ga4: { sessions: number; conversions: number } | null
  meta: { reach: number; engagement: number } | null
  tasksCompleted: { label: string; projectName: string | null }[]
  linksPlaced: { domain: string; projectName: string | null }[]
  keywordsImproved: number
  keywordsDeclined: number
  keywordsTracked: number
  commentary: string[]
}

export interface ReportRow {
  id: string
  periodStart: string
  periodEnd: string
  status: ReportStatus
  nextMonthPlan: string | null
  snapshot: ReportSnapshot
  generatedAt: string
  sentAt: string | null
}

export function useReports(accountId: string | undefined) {
  return useQuery({
    queryKey: ['reports', accountId],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select('id, period_start, period_end, status, next_month_plan, snapshot, generated_at, sent_at')
        .eq('account_id', accountId!)
        .order('period_start', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        id: r.id,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        status: r.status,
        nextMonthPlan: r.next_month_plan,
        snapshot: r.snapshot as unknown as ReportSnapshot,
        generatedAt: r.generated_at,
        sentAt: r.sent_at,
      }))
    },
    enabled: !!accountId,
  })
}

function previousPeriod(periodStart: string, periodEnd: string) {
  const start = new Date(`${periodStart}T00:00:00Z`)
  const end = new Date(`${periodEnd}T00:00:00Z`)
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const prevEnd = new Date(start.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * 86400000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { prevStart: iso(prevStart), prevEnd: iso(prevEnd) }
}

async function buildSnapshot(accountId: string, periodStart: string, periodEnd: string): Promise<ReportSnapshot> {
  const { prevStart, prevEnd } = previousPeriod(periodStart, periodEnd)

  const [searchRes, ga4Res, metaRes, projectsRes, prevSearchRes, prevGa4Res] = await Promise.all([
    supabase
      .from('metric_snapshots')
      .select('metric_key, value')
      .eq('account_id', accountId)
      .eq('source', 'gsc')
      .gte('snapshot_date', periodStart)
      .lte('snapshot_date', periodEnd),
    supabase
      .from('metric_snapshots')
      .select('metric_key, value')
      .eq('account_id', accountId)
      .eq('source', 'ga4')
      .gte('snapshot_date', periodStart)
      .lte('snapshot_date', periodEnd),
    supabase
      .from('metric_snapshots')
      .select('metric_key, value')
      .eq('account_id', accountId)
      .eq('source', 'meta')
      .gte('snapshot_date', periodStart)
      .lte('snapshot_date', periodEnd),
    supabase.from('projects').select('id, name').eq('account_id', accountId),
    supabase
      .from('metric_snapshots')
      .select('metric_key, value')
      .eq('account_id', accountId)
      .eq('source', 'gsc')
      .gte('snapshot_date', prevStart)
      .lte('snapshot_date', prevEnd),
    supabase
      .from('metric_snapshots')
      .select('metric_key, value')
      .eq('account_id', accountId)
      .eq('source', 'ga4')
      .gte('snapshot_date', prevStart)
      .lte('snapshot_date', prevEnd),
  ])
  for (const res of [searchRes, ga4Res, metaRes, projectsRes, prevSearchRes, prevGa4Res]) {
    if (res.error) throw new Error(res.error.message)
  }

  const sumBy = (rows: { metric_key: string; value: number }[], key: string) =>
    rows.filter((r) => r.metric_key === key).reduce((s, r) => s + Number(r.value), 0)

  const search = searchRes.data && searchRes.data.length > 0
    ? { clicks: sumBy(searchRes.data, 'clicks'), impressions: sumBy(searchRes.data, 'impressions') }
    : null
  const ga4 = ga4Res.data && ga4Res.data.length > 0
    ? { sessions: sumBy(ga4Res.data, 'sessions'), conversions: sumBy(ga4Res.data, 'conversions') }
    : null
  const meta = metaRes.data && metaRes.data.length > 0
    ? {
        reach: sumBy(metaRes.data, 'fb_reach') + sumBy(metaRes.data, 'ig_reach'),
        engagement: sumBy(metaRes.data, 'fb_engagement') + sumBy(metaRes.data, 'ig_engagement'),
      }
    : null

  const previousSearch = prevSearchRes.data && prevSearchRes.data.length > 0
    ? { clicks: sumBy(prevSearchRes.data, 'clicks'), impressions: sumBy(prevSearchRes.data, 'impressions') }
    : null
  const previousGa4 = prevGa4Res.data && prevGa4Res.data.length > 0
    ? { sessions: sumBy(prevGa4Res.data, 'sessions'), conversions: sumBy(prevGa4Res.data, 'conversions') }
    : null

  const projects = projectsRes.data ?? []
  const projectIds = projects.map((p) => p.id)
  const projectName = new Map(projects.map((p) => [p.id, p.name]))

  let tasksCompleted: ReportSnapshot['tasksCompleted'] = []
  let linksPlaced: ReportSnapshot['linksPlaced'] = []
  let keywordsImproved = 0
  let keywordsDeclined = 0
  let keywordsTracked = 0

  if (projectIds.length > 0) {
    const [tasksRes, backlinksRes, keywordsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('label, project_id')
        .in('project_id', projectIds)
        .eq('status', 'done')
        .gte('completed_at', periodStart)
        .lte('completed_at', `${periodEnd}T23:59:59`),
      supabase
        .from('backlinks')
        .select('domain, project_id')
        .in('project_id', projectIds)
        .eq('status', 'placed')
        .gte('placed_on', periodStart)
        .lte('placed_on', periodEnd),
      supabase
        .from('keywords')
        .select('id, project_id, keyword_checks(rank, checked_on)')
        .in('project_id', projectIds)
        .eq('archived', false),
    ])
    for (const res of [tasksRes, backlinksRes, keywordsRes]) {
      if (res.error) throw new Error(res.error.message)
    }

    tasksCompleted = (tasksRes.data ?? []).map((t) => ({
      label: t.label,
      projectName: projectName.get(t.project_id) ?? null,
    }))
    linksPlaced = (backlinksRes.data ?? []).map((b) => ({
      domain: b.domain,
      projectName: projectName.get(b.project_id) ?? null,
    }))

    keywordsTracked = (keywordsRes.data ?? []).length
    for (const k of keywordsRes.data ?? []) {
      const checks = (k.keyword_checks ?? []).slice().sort((a, b) => a.checked_on.localeCompare(b.checked_on))
      const before = checks.filter((c) => c.checked_on < periodStart).at(-1)
      const within = checks.filter((c) => c.checked_on >= periodStart && c.checked_on <= periodEnd).at(-1)
      if (before?.rank != null && within?.rank != null) {
        if (within.rank < before.rank) keywordsImproved += 1
        else if (within.rank > before.rank) keywordsDeclined += 1
      }
    }
  }

  const commentary = generateCommentary({
    search,
    previousSearch,
    ga4,
    previousGa4,
    keywordsImproved,
    keywordsDeclined,
    keywordsTracked,
    linksPlaced: linksPlaced.length,
    tasksCompleted: tasksCompleted.length,
  })

  return { search, ga4, meta, tasksCompleted, linksPlaced, keywordsImproved, keywordsDeclined, keywordsTracked, commentary }
}

export function useGenerateReport(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { periodStart: string; periodEnd: string; nextMonthPlan: string }) => {
      const snapshot = await buildSnapshot(accountId, input.periodStart, input.periodEnd)
      const { error } = await supabase.from('reports').insert({
        account_id: accountId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        next_month_plan: input.nextMonthPlan.trim() || null,
        snapshot: snapshot as never,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', accountId] })
    },
  })
}

export function useMarkReportSent(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', accountId] })
    },
  })
}

export function useDeleteReport(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reports').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', accountId] })
    },
  })
}

export function useSendReportEmail(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { reportId: string; toEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: { reportId: input.reportId, toEmail: input.toEmail },
      })
      if (error) throw new Error(error.message)
      return data as { error?: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', accountId] })
    },
  })
}
