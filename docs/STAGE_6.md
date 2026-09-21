# Stage 6 — Social and lead capture

Built from `designs/SEO CRM Development Plan.dc.html`'s Stage 6 section,
with the same deviation as Stage 4: a single shared credential (a Meta
System User access token) instead of each client connecting their own
account via OAuth.

## What's built

- **Meta connection** (`supabase/migrations/20260921220000_stage6_social_leads.sql`,
  `supabase/functions/sync-meta-performance/`): `meta_connections`
  mirrors Stage 4's `search_connections` exactly — one row per account
  per source (`facebook_page` / `instagram` / `ads`), holding the
  external Page/IG/ad-account ID and whether the token currently has
  access. The **Social & Ads** screen (`/clients/:accountId/social`,
  linked from the Account record page) shows, once each source has
  access:
  - **Facebook / Instagram**: reach, engagement, and follower counts
    (28d), plus a top-posts table (reach, engagement per post).
  - **Ads**: spend, impressions, clicks, leads, and cost per lead
    (28d) per campaign, with GA4's own conversion count shown
    alongside for reconciliation — not attribution; nothing here
    claims a lead ad caused a GA4 conversion, they're just placed
    side by side so a manager can sanity-check the two numbers.
  Before a source has access, a setup card asks for its ID and lets
  staff "check access" — identical flow to Stage 4's GSC/GA4 cards.
- **`sync-meta-performance` Edge Function**: same two-mode
  authentication (user JWT + role check / cron secret) as
  `sync-search-performance`. Unlike Google's service account, Meta's
  Graph API takes a plain bearer token — no JWT-signing exchange step
  — so the token is just read from `META_ACCESS_TOKEN` and passed as
  `access_token` on every call. Pulls Page/IG insights (reach,
  engagement, page_fans/followers_count), post- and media-level
  performance, and ad-account campaign insights (spend, impressions,
  clicks, and lead count pulled out of the `actions` array) into
  `metric_snapshots` (source `'meta'`) and the new `meta_posts_daily`
  / `meta_campaigns_daily` tables.
- **Nightly sync** (`20260921230000_nightly_meta_sync.sql`): a second
  pg_cron job, staggered 15 minutes after the Stage 4 search sync,
  reusing the same `internal_config.cron_sync_secret` — one shared
  internal call-authentication token between pg_cron and every Edge
  Function here, not a per-integration secret.
- **Content calendar** (`/clients/:accountId/calendar`): planned posts
  — platform, caption, scheduled date, owner, status
  (draft → scheduled → approved → published). No external dependency;
  usable today regardless of whether the Meta connection exists. Any
  staff member can see the plan; a member can create/edit their own
  drafts, admins/managers can manage anyone's — same self-write
  pattern as leave requests on the Capacity page.
- **UTM builder** (`/utm-builder`, in the sidebar): builds a
  `utm_source`/`utm_medium`/`utm_campaign`/`utm_term`/`utm_content`
  URL with enforced naming (lowercase, hyphenated — the plan doc's
  "enforced naming so channel attribution in GA4 stays clean"),
  optionally tied to a client, with a saved history (`utm_links`).
  This is a naming convention this app enforces on save, not a call
  to GA4 — GA4 doesn't validate UTM values, it just buckets by
  whatever string arrives, which is exactly why consistent casing
  matters.
- **Lead source standardized**: `deals.source` (already free text
  since Stage 1) now has a dropdown of standard values, including
  "Meta ad" and "Meta lead form", plus "Other" for anything else — so
  the same channel isn't spelled three different ways across deals.

## What's deliberately not here

- **Automated Meta Lead Ads webhook ingestion.** The plan doc's "form
  and Meta lead-ad submissions land in the Stage 1 pipeline with
  source intact" is implemented as: log the lead into `/deals` by hand
  with the standardized "Meta lead form" source. Auto-creating a deal
  the instant someone submits a lead form on Facebook/Instagram needs
  Meta App Review approval for the `leadgen_webhooks` permission — an
  external review process Meta runs, not a config step or a secret
  either the user or this app controls, unlike the service account /
  access token setup elsewhere in this app. Worth building once (or if)
  that review is granted; not attempted here.
- **No Google-Ads-equivalent reconciliation logic beyond showing GA4
  conversions next to ad spend.** True multi-touch attribution isn't
  something this stage claims — see the Social & Ads screen's own
  "reconciliation, not attribution" label on that stat tile.
- **No approval workflow notifications** (e.g. Slack/email when a
  calendar post moves to "approved") — the status field exists and is
  staff-editable; nothing pings anyone when it changes.

## What's still actually open (your action)

- **The Meta System User + access token don't exist yet.** Nothing
  above pulls real data until: a Meta Business Suite System User is
  created, given admin access to the relevant Page/Instagram/ad
  account assets, a long-lived access token is generated for it (free
  — Meta's Graph and Marketing APIs cost nothing to call), and that
  token is set as the `META_ACCESS_TOKEN` secret on the
  `sync-meta-performance` Edge Function. Until then every account
  correctly shows "Needs access" — same honest state Stage 4 showed
  before the Google service account existed.
- **Nightly Meta sync is unverified end-to-end**, same reason as
  Stage 4's nightly search sync: this sandbox's network policy blocks
  a direct test of the deployed function. Verified by code review, not
  a live run.
