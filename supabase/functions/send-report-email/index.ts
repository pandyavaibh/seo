// Stage 7 — manual "send now" for a report, via Resend (a free-tier
// email API — no credit card to send a low volume of transactional
// email; the user creates the account and API key, same "free service,
// staff sets up the credential" pattern as every other integration in
// this app). Takes { reportId, toEmail }: fetches the report (service
// role, bypasses RLS — this function IS the authorization check), role
// checks the caller same as every other write-triggering function
// here, renders a plain-text/HTML summary from the report's frozen
// snapshot, and sends it.
//
// This is a manual send, not a schedule. True recurring "send this
// account's report automatically on the 1st of each month" would need
// a per-account send-day config and a daily cron job — not built here,
// see docs/STAGE_7.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  linksPlaced: number
  keywordsImproved: number
  keywordsDeclined: number
  keywordsTracked: number
}

function renderHtml(accountName: string, periodStart: string, periodEnd: string, s: Snapshot, plan: string | null) {
  const rows: string[] = []
  if (s.search) rows.push(`<p><strong>Search Console</strong> — clicks ${s.search.clicks}, impressions ${s.search.impressions}</p>`)
  if (s.ga4) rows.push(`<p><strong>GA4</strong> — sessions ${s.ga4.sessions}, conversions ${s.ga4.conversions}</p>`)
  rows.push(`<p><strong>Keywords</strong> — tracked ${s.keywordsTracked}, improved ${s.keywordsImproved}, declined ${s.keywordsDeclined}</p>`)
  rows.push(`<p><strong>Links built</strong> — ${s.linksPlaced}</p>`)
  if (plan) rows.push(`<p><strong>Next month</strong><br/>${plan.replace(/\n/g, '<br/>')}</p>`)
  return `<h2>${accountName} — Monthly report</h2><p>${periodStart} to ${periodEnd}</p>${rows.join('\n')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    if (!body.reportId || !body.toEmail) return json({ error: 'reportId and toEmail are required' }, 400)

    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await asUser.auth.getUser()
    if (!user?.email) return json({ error: 'Not signed in' }, 401)

    const { data: member } = await admin
      .from('team_members')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    if (!member || !['admin', 'manager'].includes(member.role)) {
      return json({ error: 'Admin or manager role required' }, 403)
    }

    const { data: report, error: reportErr } = await admin
      .from('reports')
      .select('account_id, period_start, period_end, snapshot, next_month_plan, accounts(name)')
      .eq('id', body.reportId)
      .maybeSingle()
    if (reportErr) throw new Error(reportErr.message)
    if (!report) return json({ error: 'Report not found' }, 404)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return json(
        { error: 'RESEND_API_KEY is not set — create a free Resend account and run `supabase secrets set` (see docs/STAGE_7.md) before sending.' },
        500,
      )
    }

    const accountName = (report as { accounts?: { name: string } }).accounts?.name ?? 'Client'
    const html = renderHtml(accountName, report.period_start, report.period_end, report.snapshot as unknown as Snapshot, report.next_month_plan)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('REPORT_FROM_EMAIL') ?? 'reports@resend.dev',
        to: body.toEmail,
        subject: `${accountName} — Monthly report (${report.period_start} to ${report.period_end})`,
        html,
      }),
    })
    if (!res.ok) {
      return json({ error: `Resend failed: ${res.status} ${await res.text()}` }, 500)
    }

    await admin
      .from('reports')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', body.reportId)

    return json({ sent: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
