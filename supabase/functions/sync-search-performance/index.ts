// Stage 4 — pulls Search Console and GA4 numbers using the shared
// Google Cloud service account (see supabase/migrations/
// 20260921150000_stage4_search_performance.sql for why a service account
// instead of per-account OAuth) and writes them into metric_snapshots and
// the dimensional tables added in
// 20260921160000_stage4_gsc_ga4_detail.sql (queries, pages, countries,
// devices from GSC; channels, landing pages from GA4). See that
// migration's header for what's deliberately NOT pulled (Core Web
// Vitals, index coverage/manual actions, GA4 "assisted conversions") and
// why — none of it is available through these APIs.
//
// Two call modes:
// - User mode: the app (Search performance page's "Sync now" / "Check
//   access" buttons) calls supabase.functions.invoke, which attaches the
//   caller's session JWT. Body: { accountId }. Syncs just that account.
// - Cron mode: 20260921190000_nightly_search_sync.sql's pg_cron job
//   calls this nightly via pg_net with an `x-cron-secret` header
//   checked against the internal_config table (see that migration for
//   why a locked-down table instead of an env var). No accountId in the
//   body — syncs every account that has a search_connections row.
//
// verify_jwt is OFF for this function (set at deploy time) because the
// cron path has no Supabase-issued JWT at all — auth is handled
// entirely in code below, either the user-JWT + role check (user mode)
// or the cron-secret check (cron mode). A request with neither is
// rejected before any Google or database call happens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const WINDOW_DAYS = 28

// The app calls this from the browser (supabase.functions.invoke), which
// preflights with an OPTIONS request. Without these headers the browser
// blocks the real request before it's even sent — surfaces client-side as
// a generic "Failed to send a request to the Edge Function", not the
// function's own error.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

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

interface GscMetricRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  dimensions: string[],
  rowLimit: number,
): Promise<GscMetricRow[]> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: isoDaysAgo(WINDOW_DAYS),
      endDate: isoDaysAgo(1),
      dimensions,
      rowLimit,
    }),
  })
  if (!res.ok) {
    throw new Error(`Search Console query (${dimensions.join(',')}) failed: ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  return body.rows ?? []
}

async function syncSearchConsole(accessToken: string, siteUrl: string) {
  const [daily, byQuery, byPage, byCountry, byDevice] = await Promise.all([
    gscQuery(accessToken, siteUrl, ['date'], WINDOW_DAYS),
    gscQuery(accessToken, siteUrl, ['query'], 25),
    gscQuery(accessToken, siteUrl, ['page'], 25),
    gscQuery(accessToken, siteUrl, ['country'], 25),
    gscQuery(accessToken, siteUrl, ['device'], 10),
  ])
  return {
    dailyRows: daily.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    queryRows: byQuery.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pageRows: byPage.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    countryRows: byCountry.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    deviceRows: byDevice.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
  }
}

async function ga4Report(accessToken: string, propertyPath: string, body: Record<string, unknown>) {
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/${propertyPath}:runReport`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`GA4 runReport failed: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return (data.rows ?? []) as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
}

function ga4Date(raw: string) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

async function syncGA4(accessToken: string, property: string) {
  // GA4's own Admin UI shows the property ID as a bare number, but the
  // Data API needs it prefixed — accept either.
  const propertyPath = property.startsWith('properties/') ? property : `properties/${property}`

  const [daily, byChannel, byLandingPage] = await Promise.all([
    ga4Report(accessToken, propertyPath, {
      dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'engagementRate' }],
    }),
    ga4Report(accessToken, propertyPath, {
      dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    }),
    ga4Report(accessToken, propertyPath, {
      dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'conversions' }],
      limit: 25,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
  ])

  return {
    dailyRows: daily.map((r) => ({
      date: ga4Date(r.dimensionValues[0].value),
      sessions: Number(r.metricValues[0].value),
      conversions: Number(r.metricValues[1].value),
      engagementRate: Number(r.metricValues[2].value),
    })),
    channelRows: byChannel.map((r) => ({
      date: ga4Date(r.dimensionValues[0].value),
      channel: r.dimensionValues[1].value,
      sessions: Number(r.metricValues[0].value),
      conversions: Number(r.metricValues[1].value),
    })),
    landingPageRows: byLandingPage.map((r) => ({
      landingPage: r.dimensionValues[0].value,
      sessions: Number(r.metricValues[0].value),
      engagedSessions: Number(r.metricValues[1].value),
      conversions: Number(r.metricValues[2].value),
    })),
  }
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any

async function syncAccount(admin: SupabaseAdmin, accessToken: string, accountId: string) {
  const { data: connections, error: connErr } = await admin
    .from('search_connections')
    .select('id, source, property')
    .eq('account_id', accountId)
  if (connErr) throw new Error(connErr.message)

  const results: Record<string, { status: string; error?: string }> = {}
  const today = isoDaysAgo(0)

  for (const conn of connections ?? []) {
    try {
      if (conn.source === 'gsc') {
        const { dailyRows, queryRows, pageRows, countryRows, deviceRows } = await syncSearchConsole(
          accessToken,
          conn.property,
        )

        const dailySnapshots = dailyRows.flatMap((r) => [
          { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'clicks', value: r.clicks },
          { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'impressions', value: r.impressions },
          { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'ctr', value: r.ctr },
          { account_id: accountId, source: 'gsc', snapshot_date: r.date, metric_key: 'avg_position', value: r.position },
        ])
        if (dailySnapshots.length > 0) {
          const { error } = await admin.from('metric_snapshots').upsert(dailySnapshots)
          if (error) throw new Error(error.message)
        }

        const dimensionTable = async (table: string, keyCol: string, rows: typeof queryRows) => {
          if (rows.length === 0) return
          const { error } = await admin.from(table).upsert(
            rows.map((r) => ({
              account_id: accountId,
              snapshot_date: today,
              [keyCol]: r.key,
              clicks: r.clicks,
              impressions: r.impressions,
              ctr: r.ctr,
              avg_position: r.position,
            })),
          )
          if (error) throw new Error(error.message)
        }
        await dimensionTable('search_queries_daily', 'query', queryRows)
        await dimensionTable('search_pages_daily', 'page', pageRows)
        await dimensionTable('search_countries_daily', 'country', countryRows)
        await dimensionTable('search_devices_daily', 'device', deviceRows)
      } else if (conn.source === 'ga4') {
        const { dailyRows, channelRows, landingPageRows } = await syncGA4(accessToken, conn.property)

        const dailySnapshots = dailyRows.flatMap((r) => [
          { account_id: accountId, source: 'ga4', snapshot_date: r.date, metric_key: 'sessions', value: r.sessions },
          { account_id: accountId, source: 'ga4', snapshot_date: r.date, metric_key: 'conversions', value: r.conversions },
          { account_id: accountId, source: 'ga4', snapshot_date: r.date, metric_key: 'engagement_rate', value: r.engagementRate },
        ])
        if (dailySnapshots.length > 0) {
          const { error } = await admin.from('metric_snapshots').upsert(dailySnapshots)
          if (error) throw new Error(error.message)
        }

        if (channelRows.length > 0) {
          const { error } = await admin.from('ga4_channels_daily').upsert(
            channelRows.map((r) => ({
              account_id: accountId,
              snapshot_date: r.date,
              channel: r.channel,
              sessions: r.sessions,
              conversions: r.conversions,
            })),
          )
          if (error) throw new Error(error.message)
        }

        if (landingPageRows.length > 0) {
          const { error } = await admin.from('ga4_landing_pages_daily').upsert(
            landingPageRows.map((r) => ({
              account_id: accountId,
              snapshot_date: today,
              landing_page: r.landingPage,
              sessions: r.sessions,
              engaged_sessions: r.engagedSessions,
              conversions: r.conversions,
            })),
          )
          if (error) throw new Error(error.message)
        }
      }

      await admin
        .from('search_connections')
        .update({
          status: 'granted',
          last_checked_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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

  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const cronSecretHeader = req.headers.get('x-cron-secret')
    let accountIds: string[]
    let isCron = false

    if (cronSecretHeader) {
      const { data: cfg } = await admin
        .from('internal_config')
        .select('value')
        .eq('key', 'cron_sync_secret')
        .maybeSingle()
      if (!cfg || cfg.value !== cronSecretHeader) {
        return json({ error: 'Invalid cron secret' }, 401)
      }
      isCron = true
      const { data: conns, error: connsErr } = await admin.from('search_connections').select('account_id')
      if (connsErr) throw new Error(connsErr.message)
      accountIds = Array.from(new Set((conns ?? []).map((c: { account_id: string }) => c.account_id)))
    } else {
      const body = await req.json().catch(() => ({}))
      if (!body.accountId) return json({ error: 'accountId is required' }, 400)

      const authHeader = req.headers.get('Authorization') ?? ''
      const asUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      )
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

      accountIds = [body.accountId]
    }

    let accessToken: string
    try {
      accessToken = await getAccessToken()
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500)
    }

    const perAccount: Record<string, Record<string, { status: string; error?: string }>> = {}
    for (const accountId of accountIds) {
      perAccount[accountId] = await syncAccount(admin, accessToken, accountId)
    }

    return json(isCron ? { accounts: perAccount } : { results: perAccount[accountIds[0]] })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
