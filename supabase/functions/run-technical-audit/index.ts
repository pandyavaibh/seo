// Free technical site-audit check. No paid API: Google's PageSpeed
// Insights API is free (an optional PAGESPEED_API_KEY secret raises the
// otherwise-low unauthenticated rate limit, but isn't required for one
// person occasionally clicking "Run audit" on a client). Performance,
// SEO, Accessibility and Best Practices scores plus lab Core Web Vitals
// (LCP, CLS, INP where Lighthouse reports it) come from one Lighthouse
// run; robots.txt/sitemap.xml presence is checked directly.
//
// Same auth pattern as sync-meta-performance: caller's JWT verified,
// admin/manager role required, writes go through the service-role
// client so RLS never blocks a legitimate run.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function normalizeUrl(input: string) {
  const trimmed = input.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

async function checkPresence(baseUrl: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(new URL(path, baseUrl).toString(), { method: 'GET', redirect: 'follow' })
    return res.ok
  } catch {
    return false
  }
}

async function runLighthouse(url: string) {
  const psiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  psiUrl.searchParams.set('url', url)
  psiUrl.searchParams.set('strategy', 'mobile')
  for (const cat of ['performance', 'seo', 'accessibility', 'best-practices']) {
    psiUrl.searchParams.append('category', cat)
  }
  const apiKey = Deno.env.get('PAGESPEED_API_KEY')
  if (apiKey) psiUrl.searchParams.set('key', apiKey)

  const res = await fetch(psiUrl.toString())
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PageSpeed Insights request failed: ${res.status} ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const categories = data?.lighthouseResult?.categories ?? {}
  const audits = data?.lighthouseResult?.audits ?? {}
  const scoreOf = (cat: Record<string, unknown> | undefined) =>
    typeof cat?.score === 'number' ? Math.round(cat.score * 100) : null

  return {
    performanceScore: scoreOf(categories.performance),
    seoScore: scoreOf(categories.seo),
    accessibilityScore: scoreOf(categories.accessibility),
    bestPracticesScore: scoreOf(categories['best-practices']),
    lcpMs: typeof audits['largest-contentful-paint']?.numericValue === 'number'
      ? Math.round(audits['largest-contentful-paint'].numericValue)
      : null,
    cls: typeof audits['cumulative-layout-shift']?.numericValue === 'number'
      ? audits['cumulative-layout-shift'].numericValue
      : null,
    inpMs: typeof audits['interaction-to-next-paint']?.numericValue === 'number'
      ? Math.round(audits['interaction-to-next-paint'].numericValue)
      : null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json().catch(() => ({}))
    if (!body.accountId) return json({ error: 'accountId is required' }, 400)
    if (!body.url) return json({ error: 'url is required' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

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
      .select('id, role')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    if (!member || !['admin', 'manager'].includes(member.role)) {
      return json({ error: 'Admin or manager role required' }, 403)
    }

    const url = normalizeUrl(body.url)
    let lighthouse: Awaited<ReturnType<typeof runLighthouse>> | null = null
    let error: string | null = null
    try {
      lighthouse = await runLighthouse(url)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }

    const [hasRobotsTxt, hasSitemap] = await Promise.all([
      checkPresence(url, '/robots.txt'),
      checkPresence(url, '/sitemap.xml'),
    ])

    const { data: row, error: insertError } = await admin
      .from('technical_audits')
      .insert({
        account_id: body.accountId,
        url,
        performance_score: lighthouse?.performanceScore ?? null,
        seo_score: lighthouse?.seoScore ?? null,
        accessibility_score: lighthouse?.accessibilityScore ?? null,
        best_practices_score: lighthouse?.bestPracticesScore ?? null,
        lcp_ms: lighthouse?.lcpMs ?? null,
        cls: lighthouse?.cls ?? null,
        inp_ms: lighthouse?.inpMs ?? null,
        has_robots_txt: hasRobotsTxt,
        has_sitemap: hasSitemap,
        error,
        run_by: member.id,
      })
      .select('id')
      .single()
    if (insertError) throw new Error(insertError.message)

    return json({ id: row.id, error })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
