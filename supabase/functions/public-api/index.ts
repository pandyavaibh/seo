// Stage 8 — public read API. Free to run (this is just this app's own
// Postgres data behind a new Edge Function, not a paid API gateway
// service), authenticated by a hashed API key instead of a Supabase
// session — there is no Supabase JWT at all for an external caller, so
// verify_jwt is off and this function IS the entire auth check.
//
// GET /public-api/accounts/:id/summary
//   Authorization: Bearer sk_live_...
//
// Scope matches the client portal exactly: name, health, Stage 4
// numbers (28d), keyword coverage, links placed this month. No hours,
// no cost rates, no margins, no invoices — those never leave this
// function's reach at all, let alone the response.
//
// A key is either account-scoped (api_keys.account_id set — only that
// account's summary) or org-wide (account_id null, created without a
// client selected) — see create_api_key() in
// 20260922100000_stage8_api_keys_webhooks.sql.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(raw: string) {
  const bytes = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const url = new URL(req.url)
    const match = url.pathname.match(/\/accounts\/([^/]+)\/summary\/?$/)
    if (!match) return json({ error: 'Not found. Try GET /accounts/:id/summary' }, 404)
    const accountId = match[1]

    const authHeader = req.headers.get('Authorization') ?? ''
    const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!rawKey) return json({ error: 'Missing Authorization: Bearer <key>' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const keyHash = await sha256Hex(rawKey)
    const { data: key, error: keyErr } = await admin
      .from('api_keys')
      .select('account_id, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle()
    if (keyErr) throw new Error(keyErr.message)
    if (!key || key.revoked_at) return json({ error: 'Invalid or revoked API key' }, 401)
    if (key.account_id && key.account_id !== accountId) {
      return json({ error: 'This key is scoped to a different account' }, 403)
    }

    const today = new Date()
    const start28 = new Date(today.getTime() - 28 * 86400000).toISOString().slice(0, 10)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const todayStr = today.toISOString().slice(0, 10)

    const [accountRes, snapshotRes, projectsRes] = await Promise.all([
      admin.from('accounts').select('name, health').eq('id', accountId).maybeSingle(),
      admin
        .from('metric_snapshots')
        .select('source, metric_key, value')
        .eq('account_id', accountId)
        .gte('snapshot_date', start28),
      admin.from('projects').select('id').eq('account_id', accountId),
    ])
    if (accountRes.error) throw new Error(accountRes.error.message)
    if (snapshotRes.error) throw new Error(snapshotRes.error.message)
    if (projectsRes.error) throw new Error(projectsRes.error.message)
    if (!accountRes.data) return json({ error: 'Account not found' }, 404)

    const sumBy = (source: string, key: string) =>
      (snapshotRes.data ?? [])
        .filter((r) => r.source === source && r.metric_key === key)
        .reduce((s, r) => s + Number(r.value), 0)

    const projectIds = (projectsRes.data ?? []).map((p) => p.id)
    let keywordsTracked = 0
    let linksPlacedThisMonth = 0
    if (projectIds.length > 0) {
      const [keywordsRes, backlinksRes] = await Promise.all([
        admin.from('keywords').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('archived', false),
        admin
          .from('backlinks')
          .select('id', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('status', 'placed')
          .gte('placed_on', monthStart)
          .lte('placed_on', todayStr),
      ])
      keywordsTracked = keywordsRes.count ?? 0
      linksPlacedThisMonth = backlinksRes.count ?? 0
    }

    return json({
      account: { id: accountId, name: accountRes.data.name, health: accountRes.data.health },
      search: { clicks28d: sumBy('gsc', 'clicks'), impressions28d: sumBy('gsc', 'impressions') },
      ga4: { sessions28d: sumBy('ga4', 'sessions'), conversions28d: sumBy('ga4', 'conversions') },
      keywordsTracked,
      linksPlacedThisMonth,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
