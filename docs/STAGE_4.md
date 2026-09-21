# Stage 4 (core slice) — Search performance: GSC and GA4

Live on Travel Roach. Built from `docs/DESIGN_HANDOFF.md`'s spec, with one
deliberate deviation from `designs/SEO CRM Development Plan.dc.html`'s
Stage 4 section — see below.

## What's built

- **Migration**
  (`supabase/migrations/20260921150000_stage4_search_performance.sql`):
  `search_connections` (one row per account per source — `gsc`/`ga4` —
  holding the Google property and whether the sync service account
  currently has access to it), `metric_snapshots` (a narrow
  account/source/date/metric_key/value table — the same shape the plan
  doc's `metric_snapshot` entity describes, so Stage 5's Meta numbers
  can land in it later without a schema change), and
  `search_queries_daily` (one row per query per day, Search Console
  only). RLS: staff can read all three; only admin/manager can write
  `search_connections` (config); nobody has a direct write policy on
  the other two — only the sync job writes them, using the service
  role key, which bypasses RLS entirely. `search_connections` is
  audit-logged; the ingested tables aren't (bulk nightly writes, not
  user edits).
- **Search performance screen** (`/clients/:accountId/search`, linked
  from the Account record page): once a property is configured and the
  service account has access, shows the last-28-days stat tiles
  (clicks, impressions, average CTR, average position), a top-queries
  table, and a GA4 sessions/conversions card — built from real
  `metric_snapshots` / `search_queries_daily` rows, not mock data.
  Before that, each source shows a setup card: enter the property
  (Search Console site URL, or `properties/<id>` for GA4), save it,
  and check access.
- **`sync-search-performance` Edge Function**
  (`supabase/functions/sync-search-performance/`): authenticates to
  Google as the shared service account (JWT Bearer flow via
  `google-auth-library`), pulls the last 28 days of Search Console
  daily totals + top 25 queries and/or GA4 daily sessions/conversions
  for one account, upserts them, and flips that connection's `status`
  to `granted` on success or back to `needs_access` with the API's own
  error message on failure. Invoked from the page's "Check access" /
  "Sync now" buttons via `supabase.functions.invoke`, which attaches
  the caller's session JWT; the function itself checks the caller is
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
- **No nightly schedule.** The Edge Function only runs when a staff
  member clicks "Sync now" / "Check access". Wiring pg_cron to call it
  automatically needs a service-role invocation path the function
  doesn't implement yet — deliberately deferred rather than building
  and testing a cron job against a secret that doesn't exist.
- **Core Web Vitals, device split, and GA4 channel breakdown** were in
  the design mock but are cut from this core slice: CWV is a different
  Google API (CrUX/PageSpeed Insights, not Search Analytics) with its
  own auth story, and device/channel breakdowns are additional
  dimensional pulls not worth bundling into the first real sync.
- **The account record's original stat tiles** (organic clicks,
  keywords, links live) are still the Stage 1 substitutes — Stage 1
  deliberately didn't fabricate GSC/GA4 numbers before this stage
  existed to source them for real, and wiring the account record card
  itself to `metric_snapshots` is follow-up work, not done here.

## Where things stand across all four stages

Stage 0 (foundation), Stage 1 (Clients + Account record), Stage 2 core
slice (Project workspace), Stage 3 core slice (Capacity & strength),
and now Stage 4 core slice (Search performance) are all live and
cross-linked. The real gaps: deals/lead pipeline (Stage 1, no UI),
template library + allocation planner (Stage 2/3, no UI), and — new
this stage — no Google service account configured, so Search
performance shows real empty states everywhere until that's set up and
at least one client's properties are granted.
