# Stage 6 — Social and lead capture

Built from `designs/SEO CRM Development Plan.dc.html`'s Stage 6 section,
with the same deviation as Stage 4: a single shared credential (a Meta
System User access token) instead of each client connecting their own
account via OAuth.

## Meta/Instagram/Ads integration — removed

Built, then removed by request. It was never configured (`META_ACCESS_TOKEN`
was never set), and `meta_connections`/`meta_posts_daily`/
`meta_campaigns_daily` all had zero rows — confirmed directly against the
live database before removal, so nothing real was lost. Removed:

- The `meta_connections`, `meta_posts_daily`, `meta_campaigns_daily`
  tables and the `nightly-meta-sync` cron job
  (`supabase/migrations/20260922200000_remove_meta_integration.sql`).
- The `sync-meta-performance` Edge Function's source, deleted from the
  repo. **The deployed function itself is still live on Supabase** —
  this session's tools have no way to delete a deployed Edge Function,
  only its source. It's orphaned (nothing calls it, no cron triggers
  it, and it needs a `META_ACCESS_TOKEN` secret that was never set), so
  it's harmless, but delete it manually from the Supabase dashboard
  (Edge Functions → `sync-meta-performance` → delete) if you want it
  fully gone.
- The **Social & Ads** screen (`/clients/:accountId/social`) and its
  nav button on the Account record.
- The `meta` field on report snapshots (`ReportSnapshot`, both Edge
  Functions that build one) — reports now only ever show Search
  Console and GA4 data, which is all that's still connected.

**Untouched**, since neither depends on the Meta API:

- **Content calendar** (`/clients/:accountId/calendar`): planned posts
  — platform, caption, scheduled date, owner, status
  (draft → scheduled → approved → published). Usable today regardless
  of any Meta connection; any staff member can see the plan, a member
  can create/edit their own drafts, admins/managers can manage anyone's
  — same self-write pattern as leave requests on the Capacity page.
- **UTM builder** (`/utm-builder`, in the sidebar): builds a
  `utm_source`/`utm_medium`/`utm_campaign`/`utm_term`/`utm_content`
  URL with enforced naming (lowercase, hyphenated), optionally tied to
  a client, with saved history (`utm_links`). A naming convention this
  app enforces on save, not a call to any external API.
- **Lead source standardized**: `deals.source` has a dropdown of
  standard values, including "Meta ad" and "Meta lead form" (still
  useful for logging a lead by hand off a real Meta ad/lead form, even
  with the API integration gone) and "Website form" (added in Stage 9
  for the new `/lead` public form), plus "Other" for anything else.

If this integration is ever wanted back: it needs a Meta Business Suite
System User + long-lived access token (Meta's Graph/Marketing APIs are
free to call, same as before) — that's a "recreate from scratch" ask,
not a flag to flip back on, since the tables and function source are
gone.
