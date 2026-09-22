import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

// Stage 8 — churn-risk scoring. A fixed, transparent point rubric, not
// a trained model: every point traces to one visible factor, listed in
// `factors` so a manager can see exactly why an account scored the way
// it did rather than trusting an opaque number. Deliberately
// conservative — a factor with no applicable data (no projects, no
// portal user) is skipped rather than guessed at, so an account with
// thin data doesn't get inflated into "high risk" by default.
export interface ChurnFactor {
  label: string
  points: number
  detail: string
}

export interface ChurnRisk {
  score: number
  level: 'low' | 'medium' | 'high'
  factors: ChurnFactor[]
}

function currentAnd28dAgo() {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const start28 = new Date(now.getTime() - 28 * 86400000)
  const start56 = new Date(now.getTime() - 56 * 86400000)
  return { today: iso(now), start28: iso(start28), start56: iso(start56) }
}

export function useChurnRisk(accountId: string | undefined) {
  return useQuery({
    queryKey: ['churn-risk', accountId],
    queryFn: async (): Promise<ChurnRisk> => {
      const { today, start28, start56 } = currentAnd28dAgo()
      const [accountRes, clicksRes, invoicesRes, projectsRes, commentsRes] = await Promise.all([
        supabase.from('accounts').select('health').eq('id', accountId!).single(),
        supabase
          .from('metric_snapshots')
          .select('snapshot_date, value')
          .eq('account_id', accountId!)
          .eq('source', 'gsc')
          .eq('metric_key', 'clicks')
          .gte('snapshot_date', start56),
        supabase.from('invoices').select('id').eq('account_id', accountId!).eq('status', 'overdue'),
        supabase.from('projects').select('id').eq('account_id', accountId!),
        supabase
          .from('portal_comments')
          .select('created_at')
          .eq('account_id', accountId!)
          .order('created_at', { ascending: false })
          .limit(1),
      ])
      for (const res of [accountRes, clicksRes, invoicesRes, projectsRes, commentsRes]) {
        if (res.error) throw new Error(res.error.message)
      }

      const factors: ChurnFactor[] = []

      const health = accountRes.data?.health
      if (health === 'watch') factors.push({ label: 'Account health', points: 15, detail: 'Marked "Watch"' })
      if (health === 'at_risk') factors.push({ label: 'Account health', points: 30, detail: 'Marked "At risk"' })

      const recentClicks = (clicksRes.data ?? []).filter((r) => r.snapshot_date >= start28).reduce((s, r) => s + Number(r.value), 0)
      const priorClicks = (clicksRes.data ?? []).filter((r) => r.snapshot_date < start28).reduce((s, r) => s + Number(r.value), 0)
      if (priorClicks > 0) {
        const pctChange = ((recentClicks - priorClicks) / priorClicks) * 100
        if (pctChange <= -15) {
          factors.push({ label: 'Traffic trend', points: 20, detail: `Organic clicks down ${Math.abs(Math.round(pctChange))}% vs. the prior 28d` })
        } else if (pctChange < 0) {
          factors.push({ label: 'Traffic trend', points: 10, detail: `Organic clicks down ${Math.abs(Math.round(pctChange))}% vs. the prior 28d` })
        }
      }

      const overdueCount = (invoicesRes.data ?? []).length
      if (overdueCount > 0) {
        factors.push({ label: 'Billing', points: Math.min(30, overdueCount * 10), detail: `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}` })
      }

      const projectIds = (projectsRes.data ?? []).map((p) => p.id)
      if (projectIds.length > 0) {
        const { data: recentHours, error } = await supabase
          .from('time_entries')
          .select('hours')
          .in('project_id', projectIds)
          .gte('worked_on', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
          .lte('worked_on', today)
        if (error) throw new Error(error.message)
        const totalHours = (recentHours ?? []).reduce((s, r) => s + Number(r.hours), 0)
        if (totalHours === 0) {
          factors.push({ label: 'Delivery activity', points: 15, detail: 'No hours logged in the last 14 days' })
        }
      }

      const lastComment = commentsRes.data?.[0]?.created_at
      if (lastComment) {
        const daysSince = Math.floor((Date.now() - new Date(lastComment).getTime()) / 86400000)
        if (daysSince > 30) {
          factors.push({ label: 'Portal activity', points: 10, detail: `No comment thread activity in ${daysSince} days` })
        }
      }

      const score = factors.reduce((s, f) => s + f.points, 0)
      const level: ChurnRisk['level'] = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

      return { score, level, factors }
    },
    enabled: !!accountId,
  })
}
