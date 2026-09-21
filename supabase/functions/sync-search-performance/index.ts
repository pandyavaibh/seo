// Stage 4 — pulls Search Console and GA4 numbers for one account using the
// shared Google Cloud service account (see supabase/migrations/
// 20260921150000_stage4_search_performance.sql for why a service account
// instead of per-account OAuth) and writes them into metric_snapshots /
// search_queries_daily.
//
// Invoked from the app (Search performance page's "Sync now" / "Check
// access" buttons) via supabase.functions.invoke, which attaches the
// caller's session JWT — default JWT verification (no verify_jwt=false)
// covers auth; the role check below covers authorization.
//
// Not yet wired to a nightly schedule: pg_cron calling this per-account
// needs a service-role invocation path this function doesn't implement
// yet, deliberately deferred until GOOGLE_SERVICE_ACCOUNT_KEY actually
// exists (see docs/STAGE_4.md) — no point building and testing a cron
// path against a secret nobody has created.
//
// Unverified end-to-end: there is no real service account key in this
// environment to test against yet. Written to fail loudly and specifically
// (which Google API, which HTTP status) rather than silently, so the first
// real run is easy to debug from its own error message.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const WINDOW_DAYS = 28

function isoDaysAgo(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function getAccessToken() {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
  if (!raw) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not set — create the service account and run `supabase secrets set` (see docs/STAGE_4.md) before syncing.',
    )
  }
  const key = JSON.parse(raw)
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [GSC_SCOPE, GA4_SCOPE],
  })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Google did not return an access token.')
  return token
}

async function syncSearchConsole(
  accessToken: string,
  siteUrl: string,
): Promise<{ dailyRows: Record<string, number>[]; queryRows: Record<string, unknown>[] }> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const startDate = isoDaysAgo(WINDOW_DAYS)
  const endDate = isoDaysAgo(1)

  const [dailyRes, queryRes] = await Promise.all([
    fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['date'], rowLimit: WINDOW_DAYS }),
    }),
    fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
    }),
  ])

  if (!dailyRes.ok) {
    throw new Error(`Search Console daily query failed: ${dailyRes.status} ${await dailyRes.text()}`)
  }
  if (!queryRes.ok) {
    throw new Error(`Search Console query-level query failed: ${queryRes.status} ${await queryRes.text()}`)
  }

  const daily = await dailyRes.json()
  const byQuery = await queryRes.json()

  return {
    dailyRows: (daily.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      date: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
    queryRows: (byQuery.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
  }
}

async function syncGA4(accessToken: string, property: string) {
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    }),
  })
  if (!res.ok) {
    throw new Error(`GA4 runReport failed: ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  return (json.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
    date: `${r.dimensionValues[0].value.slice(0, 4)}-${r.dimensionValues[0].value.slice(4, 6)}-${r.dimensionValues[0].value.slice(6, 8)}`,
    sessions: Number(r.metricValues[0].value),
    conversions: Number(r.metricValues[1].value),
  }))
}

Deno.serve(async (req) => {
  try {
    const { accountId } = await req.json()
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), { status: 400 })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
    } = await asUser.auth.getUser()
    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401 })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: member } = await admin
      .from('team_members')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    if (!member || !['admin', 'manager'].includes(member.role)) {
      return new Response(JSON.stringify({ error: 'Admin or manager role required' }), { status: 403 })
    }

    const { data: connections, error: connErr } = await admin
      .from('search_connections')
      .select('id, source, property')
      .eq('account_id', accountId)
    if (connErr) throw new Error(connErr.message)

    const results: Record<string, { status: string; error?: string }> = {}
    const today = isoDaysAgo(0)

    let accessToken: string
    try {
      accessToken = await getAccessToken()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return new Response(JSON.stringify({ error: message }), { status: 500 })
    }

    for (const conn of connections ?? []) {
      try {
        if (conn.source === 'gsc') {
          const { dailyRows, queryRows } = await syncSearchConsole(accessToken, conn.property)

          const snapshotRows = dailyRows.flatMap((r) => [
            { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'clicks', value: r.clicks },
            { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'impressions', value: r.impressions },
            { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'ctr', value: r.ctr },
            { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'avg_position', value: r.position },
          ])
          if (snapshotRows.length > 0) {
            const { error } = await admin.from('metric_snapshots').upsert(snapshotRows)
            if (error) throw new Error(error.message)
          }

          const queryRowsForDb = queryRows.map((r: any) => ({
            account_id: accountId,
            snapshot_date: today,
            query: r.query,
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            avg_position: r.position,
          }))
          if (queryRowsForDb.length > 0) {
            const { error } = await admin.from('search_queries_daily').upsert(queryRowsForDb)
            if (error) throw new Error(error.message)
          }
        } else if (conn.source === 'ga4') {
          const rows = await syncGA4(accessToken, conn.property)
          const snapshotRows = rows.flatMap((r) => [
            { account_id: accountId, source: 'ga4', snapshot_date: r.date, metric_key: 'sessions', value: r.sessions },
            { account_id: accountId, source: 'ga4', snapshot_date: r.date, metric_key: 'conversions', value: r.conversions },
          ])
          if (snapshotRows.length > 0) {
            const { error } = await admin.from('metric_snapshots').upsert(snapshotRows)
            if (error) throw new Error(error.message)
          }
        }

        await admin
          .from('search_connections')
          .update({ status: 'granted', last_checked_at: new Date().toISOString(), last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', conn.id)
        results[conn.source] = { status: 'granted' }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        await admin
          .from('search_connections')
          .update({ status: 'needs_access', last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', conn.id)
        results[conn.source] = { status: 'needs_access', error: message }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
