// Cron-driven scheduled report sends. Runs daily (see the pg_cron job
// in 20260922190000_scheduled_reports.sql), checks report_schedules
// for accounts whose send_day matches today and who haven't already
// been sent last month's period, builds the report snapshot itself
// (same computation the app's own "Generate report" button does
// client-side in use-reports.ts's buildSnapshot()/generateCommentary()
// — ported here so this can run unattended, no staff action needed),
// inserts it into reports, and sends it via Resend. Fails harmlessly
// and identically to the manual send path (send-report-email) until
// RESEND_API_KEY exists — see docs/STAGE_7.md.
//
// Auth: x-cron-secret checked against internal_config, same shared
// secret and pattern as sync-search-performance's cron path. No user
// mode — this function is never called from the browser.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface Snapshot {
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

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}
function describeDelta(label: string, current: number, previous: number, unit = '') {
  const pct = pctChange(current, previous)
  if (pct == null) {
    return `${label} was ${current.toLocaleString()}${unit} this period (no comparable prior-period baseline).`
  }
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat vs.'
  const pctText = pct === 0 ? '' : ` ${Math.abs(Math.round(pct))}%`
  return `${label} ${direction}${pctText} vs. the prior period (${current.toLocaleString()}${unit} vs. ${previous.toLocaleString()}${unit}).`
}
function generateCommentary(input: {
  search: Snapshot['search']
  previousSearch: Snapshot['search']
  ga4: Snapshot['ga4']
  previousGa4: Snapshot['ga4']
  keywordsImproved: number
  keywordsDeclined: number
  keywordsTracked: number
  linksPlaced: number
  tasksCompleted: number
}): string[] {
  const lines: string[] = []
  if (input.search && input.previousSearch) {
    lines.push(describeDelta('Organic clicks', input.search.clicks, input.previousSearch.clicks))
  }
  if (input.ga4 && input.previousGa4) {
    lines.push(describeDelta('GA4 sessions', input.ga4.sessions, input.previousGa4.sessions))
    if (input.ga4.conversions > 0 || input.previousGa4.conversions > 0) {
      lines.push(describeDelta('Conversions', input.ga4.conversions, input.previousGa4.conversions))
    }
  }
  if (input.keywordsTracked > 0) {
    if (input.keywordsImproved > input.keywordsDeclined) {
      lines.push(`${input.keywordsImproved} of ${input.keywordsTracked} tracked keywords moved up in rank this period, ${input.keywordsDeclined} moved down.`)
    } else if (input.keywordsDeclined > input.keywordsImproved) {
      lines.push(`${input.keywordsDeclined} of ${input.keywordsTracked} tracked keywords moved down in rank this period, ${input.keywordsImproved} moved up.`)
    } else if (input.keywordsImproved > 0) {
      lines.push(`Keyword movement was balanced this period: ${input.keywordsImproved} up, ${input.keywordsDeclined} down.`)
    }
  }
  if (input.linksPlaced > 0) {
    lines.push(`${input.linksPlaced} backlink${input.linksPlaced === 1 ? '' : 's'} went live this period.`)
  }
  if (input.tasksCompleted > 0) {
    lines.push(`${input.tasksCompleted} delivery task${input.tasksCompleted === 1 ? '' : 's'} completed this period.`)
  }
  if (lines.length === 0) lines.push('No connected data sources or comparable prior period to summarize yet.')
  return lines
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}
function previousMonthRange(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  return { periodStart: iso(start), periodEnd: iso(end) }
}
function priorPeriod(periodStart: string, periodEnd: string) {
  const start = new Date(`${periodStart}T00:00:00Z`)
  const end = new Date(`${periodEnd}T00:00:00Z`)
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const prevEnd = new Date(start.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * 86400000)
  return { prevStart: iso(prevStart), prevEnd: iso(prevEnd) }
}

// deno-lint-ignore no-explicit-any
async function buildSnapshot(admin: any, accountId: string, periodStart: string, periodEnd: string): Promise<Snapshot> {
  const { prevStart, prevEnd } = priorPeriod(periodStart, periodEnd)

  const [searchRes, ga4Res, metaRes, projectsRes, prevSearchRes, prevGa4Res] = await Promise.all([
    admin.from('metric_snapshots').select('metric_key, value').eq('account_id', accountId).eq('source', 'gsc').gte('snapshot_date', periodStart).lte('snapshot_date', periodEnd),
    admin.from('metric_snapshots').select('metric_key, value').eq('account_id', accountId).eq('source', 'ga4').gte('snapshot_date', periodStart).lte('snapshot_date', periodEnd),
    admin.from('metric_snapshots').select('metric_key, value').eq('account_id', accountId).eq('source', 'meta').gte('snapshot_date', periodStart).lte('snapshot_date', periodEnd),
    admin.from('projects').select('id, name').eq('account_id', accountId),
    admin.from('metric_snapshots').select('metric_key, value').eq('account_id', accountId).eq('source', 'gsc').gte('snapshot_date', prevStart).lte('snapshot_date', prevEnd),
    admin.from('metric_snapshots').select('metric_key, value').eq('account_id', accountId).eq('source', 'ga4').gte('snapshot_date', prevStart).lte('snapshot_date', prevEnd),
  ])
  for (const res of [searchRes, ga4Res, metaRes, projectsRes, prevSearchRes, prevGa4Res]) {
    if (res.error) throw new Error(res.error.message)
  }

  const sumBy = (rows: { metric_key: string; value: number }[], key: string) =>
    rows.filter((r) => r.metric_key === key).reduce((s, r) => s + Number(r.value), 0)

  const search = searchRes.data?.length ? { clicks: sumBy(searchRes.data, 'clicks'), impressions: sumBy(searchRes.data, 'impressions') } : null
  const ga4 = ga4Res.data?.length ? { sessions: sumBy(ga4Res.data, 'sessions'), conversions: sumBy(ga4Res.data, 'conversions') } : null
  const meta = metaRes.data?.length
    ? { reach: sumBy(metaRes.data, 'fb_reach') + sumBy(metaRes.data, 'ig_reach'), engagement: sumBy(metaRes.data, 'fb_engagement') + sumBy(metaRes.data, 'ig_engagement') }
    : null
  const previousSearch = prevSearchRes.data?.length ? { clicks: sumBy(prevSearchRes.data, 'clicks'), impressions: sumBy(prevSearchRes.data, 'impressions') } : null
  const previousGa4 = prevGa4Res.data?.length ? { sessions: sumBy(prevGa4Res.data, 'sessions'), conversions: sumBy(prevGa4Res.data, 'conversions') } : null

  const projects = projectsRes.data ?? []
  const projectIds = projects.map((p: { id: string }) => p.id)
  const projectName = new Map(projects.map((p: { id: string; name: string }) => [p.id, p.name]))

  let tasksCompleted: Snapshot['tasksCompleted'] = []
  let linksPlaced: Snapshot['linksPlaced'] = []
  let keywordsImproved = 0
  let keywordsDeclined = 0
  let keywordsTracked = 0

  if (projectIds.length > 0) {
    const [tasksRes, backlinksRes, keywordsRes] = await Promise.all([
      admin.from('tasks').select('label, project_id').in('project_id', projectIds).eq('status', 'done').gte('completed_at', periodStart).lte('completed_at', `${periodEnd}T23:59:59`),
      admin.from('backlinks').select('domain, project_id').in('project_id', projectIds).eq('status', 'placed').gte('placed_on', periodStart).lte('placed_on', periodEnd),
      admin.from('keywords').select('id, project_id, keyword_checks(rank, checked_on)').in('project_id', projectIds).eq('archived', false),
    ])
    for (const res of [tasksRes, backlinksRes, keywordsRes]) {
      if (res.error) throw new Error(res.error.message)
    }

    tasksCompleted = (tasksRes.data ?? []).map((t: { label: string; project_id: string }) => ({ label: t.label, projectName: projectName.get(t.project_id) ?? null }))
    linksPlaced = (backlinksRes.data ?? []).map((b: { domain: string; project_id: string }) => ({ domain: b.domain, projectName: projectName.get(b.project_id) ?? null }))

    keywordsTracked = (keywordsRes.data ?? []).length
    for (const k of keywordsRes.data ?? []) {
      const checks = (k.keyword_checks ?? []).slice().sort((a: { checked_on: string }, b: { checked_on: string }) => a.checked_on.localeCompare(b.checked_on))
      const before = checks.filter((c: { checked_on: string }) => c.checked_on < periodStart).at(-1)
      const within = checks.filter((c: { checked_on: string }) => c.checked_on >= periodStart && c.checked_on <= periodEnd).at(-1)
      if (before?.rank != null && within?.rank != null) {
        if (within.rank < before.rank) keywordsImproved += 1
        else if (within.rank > before.rank) keywordsDeclined += 1
      }
    }
  }

  const commentary = generateCommentary({ search, previousSearch, ga4, previousGa4, keywordsImproved, keywordsDeclined, keywordsTracked, linksPlaced: linksPlaced.length, tasksCompleted: tasksCompleted.length })

  return { search, ga4, meta, tasksCompleted, linksPlaced, keywordsImproved, keywordsDeclined, keywordsTracked, commentary }
}

function renderHtml(accountName: string, periodStart: string, periodEnd: string, s: Snapshot) {
  const rows: string[] = []
  if (s.search) rows.push(`<p><strong>Search Console</strong> — clicks ${s.search.clicks}, impressions ${s.search.impressions}</p>`)
  if (s.ga4) rows.push(`<p><strong>GA4</strong> — sessions ${s.ga4.sessions}, conversions ${s.ga4.conversions}</p>`)
  if (s.meta) rows.push(`<p><strong>Social</strong> — reach ${s.meta.reach}, engagement ${s.meta.engagement}</p>`)
  if (s.commentary.length) rows.push(`<p><strong>Summary</strong><br/>${s.commentary.join('<br/>')}</p>`)
  rows.push(`<p><strong>Keywords</strong> — tracked ${s.keywordsTracked}, improved ${s.keywordsImproved}, declined ${s.keywordsDeclined}</p>`)
  rows.push(`<p><strong>Links built</strong> — ${s.linksPlaced.length}</p>`)
  rows.push(`<p><strong>Work completed</strong> — ${s.tasksCompleted.length} items</p>`)
  return `<h2>${accountName} — Monthly report</h2><p>${periodStart} to ${periodEnd}</p>${rows.join('\n')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const cronSecretHeader = req.headers.get('x-cron-secret')
    const { data: cfg } = await admin.from('internal_config').select('value').eq('key', 'cron_sync_secret').maybeSingle()
    if (!cfg || cfg.value !== cronSecretHeader) {
      return json({ error: 'Invalid cron secret' }, 401)
    }

    const today = new Date().getUTCDate()
    const { periodStart, periodEnd } = previousMonthRange()

    const { data: schedules, error: schedError } = await admin
      .from('report_schedules')
      .select('id, account_id, recipient_email, send_day, last_sent_period_end, accounts(name)')
      .eq('active', true)
      .eq('send_day', today)
    if (schedError) throw new Error(schedError.message)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const results: Record<string, string> = {}

    for (const schedule of schedules ?? []) {
      if (schedule.last_sent_period_end === periodEnd) {
        results[schedule.id] = 'already sent for this period'
        continue
      }
      try {
        const accountName = (schedule as { accounts?: { name: string } }).accounts?.name ?? 'Client'
        const snapshot = await buildSnapshot(admin, schedule.account_id, periodStart, periodEnd)

        const { data: report, error: insertError } = await admin
          .from('reports')
          .insert({ account_id: schedule.account_id, period_start: periodStart, period_end: periodEnd, snapshot })
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)

        if (!resendKey) {
          results[schedule.id] = 'report generated, but RESEND_API_KEY is not set — not sent'
          continue
        }

        const html = renderHtml(accountName, periodStart, periodEnd, snapshot)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: Deno.env.get('REPORT_FROM_EMAIL') ?? 'reports@resend.dev',
            to: schedule.recipient_email,
            subject: `${accountName} — Monthly report (${periodStart} to ${periodEnd})`,
            html,
          }),
        })
        if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`)

        await admin.from('reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', report.id)
        await admin.from('report_schedules').update({ last_sent_period_end: periodEnd }).eq('id', schedule.id)
        results[schedule.id] = 'sent'
      } catch (e) {
        results[schedule.id] = e instanceof Error ? e.message : String(e)
      }
    }

    return json({ checked: (schedules ?? []).length, results })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
