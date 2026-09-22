# Stage 8 — Intelligence

Built from `designs/SEO CRM Development Plan.dc.html`'s Stage 8
section, which is explicitly marked **"ongoing"** rather than a fixed
sprint — five things, each free-standing: traffic forecasting, anomaly
detection, AI-written report commentary, churn-risk scoring, and a
public API with webhooks. Asked how to scope the one genuinely
paid-API-dependent piece (AI-written commentary needs an LLM call),
the user chose **rule-based commentary only** — no LLM, no new
external cost, consistent with the no-paid-plan stance applied
throughout this build.

## What's built

- **Traffic forecasting** (`features/intelligence/forecast.ts`,
  surfaced on the Search performance page): a simple linear trend
  (ordinary least squares) fitted over whatever daily history Stage 4
  already has, projected forward across the same window length, shown
  against the account's combined project traffic goals. Documented in
  its own UI copy as "if this rate holds," not a seasonal or
  statistical model — it doesn't pretend to be more sophisticated than
  it is.
- **Anomaly detection** (`features/intelligence/anomalies.ts`, same
  card): flags a day as anomalous by comparing it to the mean/stddev
  of *that same weekday* across the available history — a Sunday dip
  that happens every Sunday isn't flagged, only a real outlier for
  that weekday is. A weekday with fewer than 2 prior samples is
  skipped rather than guessed at.
- **Rule-based report commentary** (`features/intelligence/
  report-commentary.ts`): the report builder now also pulls the prior
  equal-length period's Search/GA4 numbers and generates templated
  sentences ("Organic clicks up 12% vs. the prior period…") — every
  sentence traces to a number already in the report snapshot. Shown in
  the staff Reports page, the client portal's Reports page, and the
  PDF export.
- **Churn-risk scoring** (`features/intelligence/use-churn-risk.ts`,
  a card on the Account record page): a fixed, transparent point
  rubric — account health (Watch +15 / At risk +30), organic traffic
  trend (down ≥15% vs. the prior 28d: +20; any decline: +10), overdue
  invoices (+10 each, capped), no hours logged in 14 days (+15), no
  portal comment-thread activity in 30+ days (+10) — bucketed into
  Low/Medium/High. Not a trained model; every point is listed with the
  fact that produced it. A factor with no applicable data (no
  projects, no portal user, no prior-period baseline) is skipped
  rather than inflating the score — an account with thin data doesn't
  default to "high risk." Not surfaced on the Clients list (would mean
  running this computation for every account on every list load); a
  per-account detail view was the scope kept here.
- **Public read API** (`supabase/functions/public-api/`): `GET
  /accounts/:id/summary`, authenticated by a bearer API key (SHA-256
  hashed at rest, shown once at creation — same convention as GitHub/
  Stripe tokens) instead of a Supabase session, since an external
  caller has no Supabase JWT at all. Returns exactly the client
  portal's scope — name, health, 28d Search/GA4 numbers, keyword
  coverage, links placed this month — never hours, cost rates,
  margins, or invoices. A key is either account-scoped or org-wide.
  Free to run: this is this app's own Postgres data behind an Edge
  Function, not a paid API gateway product.
- **Webhooks**: `webhook_subscriptions` + `fire_webhooks()` fire an
  outbound POST (with an `x-webhook-secret` header) via `pg_net` —
  already used for the nightly syncs, so no new infrastructure — on
  three events: `report.sent`, `invoice.paid`, `deal.won`. A fixed
  small set of event types rather than a generic event bus; adding
  another means one more trigger the same shape as these three.
- **Developer page** (`/developer`, admin-only, in the sidebar):
  create/revoke API keys and register/toggle/remove webhook
  subscriptions, with the raw key/secret shown exactly once at
  creation time.

## A security fix caught before shipping

`fire_webhooks()` and the three `trg_*()` trigger functions initially
inherited this app's usual default of being callable directly (every
Postgres function here is `SECURITY DEFINER` and Supabase grants
`EXECUTE` to `anon`/`authenticated` on every public-schema function by
default). For the existing helper functions (`auth_member_id()` etc.)
that's harmless — they only ever report facts about the caller. It
was **not** harmless for `fire_webhooks()`: called directly with an
arbitrary event/account/payload, any signed-in user could have spoofed
a `report.sent`/`invoice.paid`/`deal.won` event with fabricated data at
every subscriber's URL. Caught via the standard post-migration
`get_advisors` check, then closed by explicitly revoking `EXECUTE` on
`fire_webhooks()` and the three trigger functions from `anon` and
`authenticated` (see `20260922100200_lock_down_webhook_internals_fix.sql`
— note revoking from the `PUBLIC` pseudo-role alone doesn't work here,
since Supabase grants directly to `anon`/`authenticated`, not just
`PUBLIC`). Verified with `has_function_privilege()`, not just by
re-reading the advisor output. The triggers still fire correctly —
trigger invocation isn't gated by the invoking role's `EXECUTE`
privilege on the trigger function at all.

## What's deliberately not here

- **No LLM-written commentary.** Per the user's explicit scoping
  decision — a real LLM API is a paid, usage-billed service unlike
  everything else in this app. The rule-based commentary above covers
  the same report-summary need for free.
- **No churn-risk badge on the Clients list** — kept to a per-account
  detail view to avoid running the computation for every row on every
  list load; a cached/scheduled version would be the natural follow-up
  if list-level surfacing turns out to matter.
- **No generic event bus for webhooks** — three fixed event types,
  each its own trigger. Deliberately not built as an abstract
  "subscribe to any table change" system.
