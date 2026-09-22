# Stage 4 — Search performance: GSC and GA4

Live on Travel Roach. Built from `docs/DESIGN_HANDOFF.md`'s spec, with one
deliberate deviation from `designs/SEO CRM Development Plan.dc.html`'s
Stage 4 section — see below.

## What's built

- **Core migration**
  (`supabase/migrations/20260921150000_stage4_search_performance.sql`):
  `search_connections` (one row per account per source — `gsc`/`ga4` —
  holding the Google property and whether the sync service account
  currently has access to it), `metric_snapshots` (a narrow
  account/source/date/metric_key/value table — the same shape the plan
  doc's `metric_snapshot` entity describes, so Stage 5's Meta numbers
  can land in it later without a schema change), and
  `search_queries_daily` (one row per query per day, Search Console
  only).
- **Detail migration**
  (`supabase/migrations/20260921160000_stage4_gsc_ga4_detail.sql`):
  `search_pages_daily`, `search_countries_daily`, `search_devices_daily`
  (same shape as `search_queries_daily`, different GSC dimension) and
  `ga4_channels_daily` / `ga4_landing_pages_daily` for GA4. See that
  file's header for what's deliberately still not pulled — Core Web
  Vitals, index coverage, manual actions, GA4 "assisted conversions" —
  and why (mostly: not available through these APIs at all, not a
  scoping choice).
- RLS across every table above: staff can read; only admin/manager can
  write `search_connections` (config, audit-logged); nobody has a
  direct write policy on any of the ingested tables — only the sync job
  writes them, using the service role key, which bypasses RLS entirely.
- **Search performance screen** (`/clients/:accountId/search`, linked
  from the Account record page): once a property is configured and the
  service account has access —
  - **Search Console**: clicks/impressions/CTR/average position stat
    tiles (28d), top queries, top pages, top countries, device split —
    all real, all from Search Console's own dimension breakdowns.
  - **GA4**: sessions/conversions/engagement-rate stat tiles (28d),
    channel breakdown, top landing pages.
  Before a source has access, it shows a setup card instead: enter the
  property (Search Console site URL, or `properties/<id>`/bare numeric
  ID for GA4 — the function accepts either), save it, check access.
- **`sync-search-performance` Edge Function**
  (`supabase/functions/sync-search-performance/`): authenticates to
  Google as the shared service account (JWT Bearer flow via
  `google-auth-library`), and per account with a connection:
  - GSC: 5 parallel `searchAnalytics.query` calls (date; query; page;
    country; device — all over the trailing 28 days) into
    `metric_snapshots` + the four dimension tables.
  - GA4: 3 parallel `runReport` calls (date totals incl.
    engagement rate; date × channel; landing page) into
    `metric_snapshots` + `ga4_channels_daily` + `ga4_landing_pages_daily`.
  Flips that connection's `status` to `granted` on success or back to
  `needs_access` with the API's own error message on failure (this is
  how the CORS-preflight bug and the GA4 property-ID format mismatch
  were actually found and fixed against a real Google account — the
  function surfaces exactly what Google rejected, not a generic
  failure). Invoked from the page's "Check access" / "Sync now"
  buttons via `supabase.functions.invoke`; checks the caller is
  admin/manager before touching anything.

## The service-account decision

The plan doc called for each account connecting its own Google property
via OAuth. Changed to a single shared Google Cloud service account
instead, with sign-off: VR Bonkers staff add that service account as a
user on each client's Search Console property and as a Viewer on each
client's GA4 property (both one-time, done in Google's own UI, not this
app), and the same account syncs everyone. No OAuth consent screen, no
per-account refresh tokens to store or rotate, and it matches how every
other integration in this app is staff-managed rather than
client-self-service.

## What's not live yet

- **No Google Cloud service account exists yet.** Nothing above can
  actually pull real data until one is created (Search Console API +
  Google Analytics Data API enabled, a service account created, its
  JSON key set as the `GOOGLE_SERVICE_ACCOUNT_KEY` secret on this
  Edge Function) and added to at least one client's properties. Until
  then every account correctly shows "Needs access" — that's the real
  state, not a bug.
- ~~**No nightly schedule.**~~ Built:
  `20260921190000_nightly_search_sync.sql` adds an `internal_config`
  table (RLS enabled, zero policies — deny-all except service role;
  holds a random secret the migration generates itself, not a Google
  credential, so no dashboard access was needed for this part) and a
  pg_cron job that calls the Edge Function nightly at 03:00 UTC via
  pg_net with that secret in an `x-cron-secret` header. The function
  now has two modes — user (one account, JWT + role checked) and cron
  (every account with a connection, secret checked) — and is deployed
  with `verify_jwt=false` since the cron path carries no Supabase JWT
  at all; both paths are fully authenticated in the function's own
  code before touching Google or the database. **Unverified
  end-to-end** — this sandbox's outbound network policy blocks a
  direct curl test of the deployed function, so this is verified by
  code review, not a live run. It fails harmlessly and identically to
  the manual path (the same "GOOGLE_SERVICE_ACCOUNT_KEY is not set"
  error) until that secret exists.
- **Core Web Vitals, index coverage, manual actions, GA4 "assisted
  conversions"** — not gaps to fill later, genuinely unavailable
  through the APIs this integration uses. See the detail migration's
  header for the specifics on each.
- **The account record's original stat tiles** (organic clicks,
  keywords, links live) are still the Stage 1 substitutes — Stage 1
  deliberately didn't fabricate GSC/GA4 numbers before this stage
  existed to source them for real, and wiring the account record card
  itself to `metric_snapshots` is follow-up work, not done here.
- **No "add contact" or "new engagement" UI** — pre-existing Stage 1/2
  gaps, unrelated to this stage, still open.
- **Project-level KPI/OKR reporting** — a distinct, larger piece
  (rankings vs. targets, traffic/conversions vs. goals, hours vs.
  budget, custom KPIs) requested alongside this expansion; not started,
  needs its own design pass since nothing like it exists in the schema
  yet.

## Real-world fixes made against a live Google account

Once a real service account and a real client's GSC/GA4 properties were
connected, two bugs only a live call could surface: the Edge Function
didn't handle the browser's CORS preflight (every call 500'd on
`OPTIONS` before reaching the function's own logic — found via
`query_logs`, not guesswork), and GA4's Admin UI shows the property ID
as a bare number while the Data API requires it prefixed with
`properties/` — the function now accepts either. Both are fixed in the
current deployed version.

## Adding a real client

`Add client` on the Clients list is wired up for real (Stage 1 shipped
it disabled) — name, website, industry, retainer, hours budget, renewal
date, straight into `accounts` via the RLS policy that already existed.
Contacts and engagements still have no add-UI (see above).

## Where things stand across all eight stages

Stage 0 (foundation), Stage 1 (Clients + Account record), Stage 2 core
slice (Project workspace), Stage 3 core slice (Capacity & strength),
Stage 4 (Search performance, full GSC/GA4 detail, nightly sync wired),
Stage 5 (backlink production — see `docs/STAGE_5.md`), Stage 6 (social
and lead capture — see `docs/STAGE_6.md`), Stage 7 (reporting, client
portal, billing — see `docs/STAGE_7.md`), and Stage 8 (intelligence —
see `docs/STAGE_8.md`) are all live and cross-linked. Every gap this
file used to list here is closed: deals/lead pipeline (`/deals`),
contacts (add/edit/remove on the Account record), staffing (both
per-project and the Capacity page's allocation planner), template
library + apply-to-project + recurring monthly generation
(`/templates`), leave/availability (Capacity page), account record's
stat tiles (real Stage 4 numbers), the project-level KPI/OKR report
(keyword targets in Rankings, traffic/conversions vs goal, custom
KPIs), backlink tracking (prospect → outreach → placed, manual, on the
project workspace), social/lead capture (Meta connection, content
calendar, UTM builder, standardized lead source), reporting/portal/
billing (report builder with PDF export, a real client portal,
invoices/expenses, admin-only profitability), and intelligence
(traffic forecasting, anomaly detection, rule-based report commentary,
churn-risk scoring, a public API with webhooks) — see each feature's
own commit message for the reasoning behind it.

What's still actually open: the Google Cloud service account itself
(nothing Stage 4 does is real until that exists — every account
correctly shows "Needs access" until then), the Meta System User +
access token (same story for Stage 6's Social & Ads screen), a Resend
account + API key for Stage 7's "send report by email" button, and all
three nightly/manual sync paths are unverified end-to-end against a
real external call (this sandbox's network policy blocks a direct test
of the deployed functions; verified by code review only). Stage 5
deliberately has no authority-score data (Domain Rating, DA) — that
needs a paid API, cut per the user's no-paid-plan decision; see
`docs/STAGE_5.md`. Stage 6 deliberately has no automated Meta Lead Ads
webhook ingestion — that needs Meta App Review, an external approval
gate; see `docs/STAGE_6.md`. Stage 7 deliberately has no payment
processor and no recurring auto-scheduled report email — see
`docs/STAGE_7.md`. Stage 8 deliberately has no LLM-written report
commentary (rule-based instead, per the user's scoping decision) and
no churn-risk badge on the Clients list (per-account detail view only)
— see `docs/STAGE_8.md`. Stage 8 is explicitly "ongoing" per the plan
doc, not a stage with a defined finish line the way 0–7 were.
