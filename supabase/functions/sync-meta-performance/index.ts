// Stage 6 — pulls Facebook Page, Instagram, and Meta Ads numbers using a
// shared Meta System User access token (see supabase/migrations/
// 20260921220000_stage6_social_leads.sql for why a shared token instead
// of per-client OAuth — same reasoning as Stage 4's Google service
// account) and writes them into metric_snapshots (source='meta') plus
// meta_posts_daily / meta_campaigns_daily.
//
// Unlike Google's service account, Meta's Graph API takes a plain
// bearer token — no JWT-signing exchange step. A System User's token is
// long-lived (does not expire on a fixed schedule, only on manual
// revoke or a password/permissions change), generated for free in Meta
// Business Suite; calling the Graph API and Marketing API costs
// nothing, same "free API, staff sets it up once" pattern as Stage 4.
//
// Two call modes, identical structure to sync-search-performance:
// - User mode: Social & Ads page's "Sync now" / "Check access" buttons
//   call supabase.functions.invoke with { accountId }, caller's JWT
//   checked for admin/manager role.
// - Cron mode: nightly-search-sync's pg_cron job already fires
//   sync-search-performance; this function is invoked the same way by
//   a companion nightly-meta-sync job with an `x-cron-secret` header
//   checked against internal_config, syncing every account with a
//   meta_connections row.
//
// verify_jwt is OFF for this function at deploy time, same reason as
// sync-search-performance: the cron path carries no Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_VERSION = 'v21.0'
const WINDOW_DAYS = 28

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

function getAccessToken() {
  const token = Deno.env.get('META_ACCESS_TOKEN')
  if (!token) {
    throw new Error(
      'META_ACCESS_TOKEN is not set — create a Meta System User + long-lived token and run `supabase secrets set` (see docs/STAGE_6.md) before syncing.',
    )
  }
  return token
}

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', accessToken)
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Graph API ${path} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

interface DailyTotals {
  date: string
  reach: number
  engagement: number
}

async function pageInsightsDaily(pageId: string, accessToken: string): Promise<DailyTotals[]> {
  const data = await graphGet(`${pageId}/insights`, accessToken, {
    metric: 'page_impressions_unique,page_post_engagements',
    period: 'day',
    since: isoDaysAgo(WINDOW_DAYS),
    until: isoDaysAgo(0),
  })
  const byDate = new Map<string, DailyTotals>()
  for (const series of data.data ?? []) {
    const key = series.name === 'page_impressions_unique' ? 'reach' : 'engagement'
    for (const point of series.values ?? []) {
      const date = String(point.end_time).slice(0, 10)
      const entry = byDate.get(date) ?? { date, reach: 0, engagement: 0 }
      entry[key as 'reach' | 'engagement'] = Number(point.value) || 0
      byDate.set(date, entry)
    }
  }
  return Array.from(byDate.values())
}

async function pageFollowers(pageId: string, accessToken: string): Promise<number> {
  const data = await graphGet(pageId, accessToken, { fields: 'fan_count' })
  return Number(data.fan_count) || 0
}

async function pagePosts(pageId: string, accessToken: string) {
  const data = await graphGet(`${pageId}/posts`, accessToken, {
    fields: 'id,message,permalink_url,created_time,insights.metric(post_impressions_unique,post_engaged_users)',
    limit: '25',
  })
  return (data.data ?? []).map((p: Record<string, unknown>) => {
    const insights = (p.insights as { data?: { name: string; values: { value: number }[] }[] })?.data ?? []
    const reach = insights.find((i) => i.name === 'post_impressions_unique')?.values?.[0]?.value ?? 0
    const engaged = insights.find((i) => i.name === 'post_engaged_users')?.values?.[0]?.value ?? 0
    return {
      postId: String(p.id),
      permalink: (p.permalink_url as string) ?? null,
      caption: (p.message as string)?.slice(0, 280) ?? null,
      publishedAt: (p.created_time as string) ?? null,
      reach: Number(reach),
      engagement: Number(engaged),
      likes: 0,
      comments: 0,
      shares: 0,
    }
  })
}

async function igInsightsDaily(igId: string, accessToken: string): Promise<DailyTotals[]> {
  const data = await graphGet(`${igId}/insights`, accessToken, {
    metric: 'reach,accounts_engaged',
    period: 'day',
    metric_type: 'time_series',
    since: isoDaysAgo(WINDOW_DAYS),
    until: isoDaysAgo(0),
  })
  const byDate = new Map<string, DailyTotals>()
  for (const series of data.data ?? []) {
    const key = series.name === 'reach' ? 'reach' : 'engagement'
    for (const point of series.values ?? []) {
      const date = String(point.end_time).slice(0, 10)
      const entry = byDate.get(date) ?? { date, reach: 0, engagement: 0 }
      entry[key as 'reach' | 'engagement'] = Number(point.value) || 0
      byDate.set(date, entry)
    }
  }
  return Array.from(byDate.values())
}

async function igFollowers(igId: string, accessToken: string): Promise<number> {
  const data = await graphGet(igId, accessToken, { fields: 'followers_count' })
  return Number(data.followers_count) || 0
}

async function igMedia(igId: string, accessToken: string) {
  const data = await graphGet(`${igId}/media`, accessToken, {
    fields: 'id,caption,permalink,timestamp,like_count,comments_count,insights.metric(reach,total_interactions)',
    limit: '25',
  })
  return (data.data ?? []).map((m: Record<string, unknown>) => {
    const insights = (m.insights as { data?: { name: string; values: { value: number }[] }[] })?.data ?? []
    const reach = insights.find((i) => i.name === 'reach')?.values?.[0]?.value ?? 0
    const engagement = insights.find((i) => i.name === 'total_interactions')?.values?.[0]?.value ?? 0
    return {
      postId: String(m.id),
      permalink: (m.permalink as string) ?? null,
      caption: (m.caption as string)?.slice(0, 280) ?? null,
      publishedAt: (m.timestamp as string) ?? null,
      reach: Number(reach),
      engagement: Number(engagement),
      likes: Number(m.like_count) || 0,
      comments: Number(m.comments_count) || 0,
      shares: 0,
    }
  })
}

async function adAccountDaily(adAccountId: string, accessToken: string) {
  const acct = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const data = await graphGet(`${acct}/insights`, accessToken, {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions',
    time_range: JSON.stringify({ since: isoDaysAgo(WINDOW_DAYS), until: isoDaysAgo(0) }),
    time_increment: '1',
  })
  return (data.data ?? []).map((row: Record<string, unknown>) => {
    const actions = (row.actions as { action_type: string; value: string }[] | undefined) ?? []
    const leads = actions.find((a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
    return {
      date: String(row.date_start),
      campaignId: String(row.campaign_id),
      campaignName: String(row.campaign_name),
      spendCents: Math.round(Number(row.spend ?? 0) * 100),
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      leads: leads ? Number(leads.value) || 0 : 0,
    }
  })
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any

async function syncAccount(admin: SupabaseAdmin, accessToken: string, accountId: string) {
  const { data: connections, error: connErr } = await admin
    .from('meta_connections')
    .select('id, source, property')
    .eq('account_id', accountId)
  if (connErr) throw new Error(connErr.message)

  const results: Record<string, { status: string; error?: string }> = {}
  const today = isoDaysAgo(0)

  for (const conn of connections ?? []) {
    try {
      if (conn.source === 'facebook_page') {
        const [daily, followers, posts] = await Promise.all([
          pageInsightsDaily(conn.property, accessToken),
          pageFollowers(conn.property, accessToken),
          pagePosts(conn.property, accessToken),
        ])

        const snapshots = daily.flatMap((r) => [
          { account_id: accountId, source: 'meta', snapshot_date: r.date, metric_key: 'fb_reach', value: r.reach },
          { account_id: accountId, source: 'meta', snapshot_date: r.date, metric_key: 'fb_engagement', value: r.engagement },
        ])
        snapshots.push({ account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'fb_followers', value: followers })
        const { error: snapErr } = await admin.from('metric_snapshots').upsert(snapshots)
        if (snapErr) throw new Error(snapErr.message)

        if (posts.length > 0) {
          const { error } = await admin.from('meta_posts_daily').upsert(
            posts.map((p: Record<string, unknown>) => ({
              account_id: accountId,
              snapshot_date: today,
              post_id: p.postId,
              platform: 'facebook_page',
              permalink: p.permalink,
              caption: p.caption,
              published_at: p.publishedAt,
              reach: p.reach,
              engagement: p.engagement,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
            })),
          )
          if (error) throw new Error(error.message)
        }
      } else if (conn.source === 'instagram') {
        const [daily, followers, media] = await Promise.all([
          igInsightsDaily(conn.property, accessToken),
          igFollowers(conn.property, accessToken),
          igMedia(conn.property, accessToken),
        ])

        const snapshots = daily.flatMap((r) => [
          { account_id: accountId, source: 'meta', snapshot_date: r.date, metric_key: 'ig_reach', value: r.reach },
          { account_id: accountId, source: 'meta', snapshot_date: r.date, metric_key: 'ig_engagement', value: r.engagement },
        ])
        snapshots.push({ account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'ig_followers', value: followers })
        const { error: snapErr } = await admin.from('metric_snapshots').upsert(snapshots)
        if (snapErr) throw new Error(snapErr.message)

        if (media.length > 0) {
          const { error } = await admin.from('meta_posts_daily').upsert(
            media.map((p: Record<string, unknown>) => ({
              account_id: accountId,
              snapshot_date: today,
              post_id: p.postId,
              platform: 'instagram',
              permalink: p.permalink,
              caption: p.caption,
              published_at: p.publishedAt,
              reach: p.reach,
              engagement: p.engagement,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
            })),
          )
          if (error) throw new Error(error.message)
        }
      } else if (conn.source === 'ads') {
        const campaignDays = await adAccountDaily(conn.property, accessToken)

        if (campaignDays.length > 0) {
          const { error } = await admin.from('meta_campaigns_daily').upsert(
            campaignDays.map((r: Record<string, unknown>) => ({
              account_id: accountId,
              snapshot_date: r.date,
              campaign_id: r.campaignId,
              campaign_name: r.campaignName,
              spend_cents: r.spendCents,
              impressions: r.impressions,
              clicks: r.clicks,
              leads: r.leads,
            })),
          )
          if (error) throw new Error(error.message)
        }

        const totals = campaignDays.reduce(
          (acc: { spend: number; impressions: number; clicks: number; leads: number }, r: Record<string, unknown>) => ({
            spend: acc.spend + (Number(r.spendCents) || 0),
            impressions: acc.impressions + (Number(r.impressions) || 0),
            clicks: acc.clicks + (Number(r.clicks) || 0),
            leads: acc.leads + (Number(r.leads) || 0),
          }),
          { spend: 0, impressions: 0, clicks: 0, leads: 0 },
        )
        const { error: snapErr } = await admin.from('metric_snapshots').upsert([
          { account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'ad_spend_cents', value: totals.spend },
          { account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'ad_impressions', value: totals.impressions },
          { account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'ad_clicks', value: totals.clicks },
          { account_id: accountId, source: 'meta', snapshot_date: today, metric_key: 'ad_leads', value: totals.leads },
        ])
        if (snapErr) throw new Error(snapErr.message)
      }

      await admin
        .from('meta_connections')
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
        .from('meta_connections')
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
      const { data: conns, error: connsErr } = await admin.from('meta_connections').select('account_id')
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
      accessToken = getAccessToken()
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
