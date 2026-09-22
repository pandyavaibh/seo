// Public lead-capture endpoint — no auth, called from a form embedded
// on the agency's own marketing site or this app's own /lead page. The
// `leads` table's own RLS (anon insert, narrow with-check) is the real
// gate; this function adds one cheap, free layer on top: a honeypot
// field real visitors never see or fill, so unsophisticated scraper
// bots that blindly fill every input get silently dropped (this
// function still returns success, so a bot never learns its
// submission was rejected). No rate limiting — that needs a real store
// (Cloudflare's own rate limiting is a paid feature on this account's
// tier); staff triage (mark spam/archive on the Leads inbox) is the
// practical backstop instead, same tradeoff every small business
// contact form makes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json().catch(() => ({}))

  // Honeypot — a field named to look attractive to bots, hidden from
  // real users with CSS. Any value here means it's not a person.
  if (body.website_url) {
    return json({ ok: true })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  if (!name || !email || !EMAIL_RE.test(email)) {
    return json({ error: 'A valid name and email are required' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await admin.from('leads').insert({
    name,
    email,
    phone: body.phone ? String(body.phone).trim().slice(0, 40) : null,
    company: body.company ? String(body.company).trim().slice(0, 200) : null,
    message: body.message ? String(body.message).trim().slice(0, 2000) : null,
  })
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true })
})
