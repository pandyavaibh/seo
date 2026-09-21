-- =====================================================================
-- Stage 6 — Social and lead capture (Meta connection, content calendar,
-- UTM builder, lead source)
--
-- Same deviation as Stage 4: the plan doc's Stage 6 calls for "Facebook
-- Page and Instagram professional account per client" — built here as
-- a single shared Meta System User access token (staff sets it up once
-- in Meta Business Suite, free, no ad spend required to call the API),
-- not per-client OAuth. Mirrors search_connections exactly: one row
-- per account per source, source in ('facebook_page', 'instagram',
-- 'ads'), holding the external Page/IG/ad-account ID and whether the
-- token currently has access. Same "staff-managed, not
-- client-self-service" reasoning as docs/STAGE_4.md.
--
-- metric_snapshots already exists as a generic account/source/date/
-- metric_key table specifically so Meta's numbers could land in it
-- without a schema change (see that migration's header) — this just
-- widens its source check constraint to include 'meta'. It holds
-- account-wide daily totals: reach, engagement, followers (organic)
-- and spend, impressions, clicks, leads (paid, aggregated across
-- campaigns).
--
-- meta_posts_daily and meta_campaigns_daily are dimensional, same
-- shape and same "latest snapshot" read pattern as search_pages_daily/
-- search_queries_daily: post-level and campaign-level breakdowns,
-- refreshed each sync, not a growing history per post/campaign.
--
-- content_calendar and utm_links have no external dependency — built
-- and usable today, independent of the Meta connection existing.
--
-- Lead routing (plan doc: "form and Meta lead-ad submissions land in
-- the Stage 1 pipeline with source intact") reuses the existing deals
-- table from Stage 1, which already has a free-text `source` column —
-- no schema change needed, just a standardized dropdown in the app.
-- Automated Meta Lead Ads webhook ingestion (auto-creating a deal the
-- moment someone submits a lead form on Facebook/Instagram) is NOT
-- built here: it requires Meta App Review approval for the
-- leadgen_webhooks permission, an external approval process outside
-- either the user's or this app's control, not just a config/secret
-- step like the service account. See docs/STAGE_6.md.
-- =====================================================================

alter table metric_snapshots drop constraint metric_snapshots_source_check;
alter table metric_snapshots add constraint metric_snapshots_source_check
  check (source in ('gsc', 'ga4', 'meta'));

create table meta_connections (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  source          text not null check (source in ('facebook_page', 'instagram', 'ads')),
  property        text not null,   -- facebook_page: Page ID; instagram: IG business account ID; ads: ad account ID
  status          text not null default 'needs_access' check (status in ('needs_access', 'granted')),
  last_checked_at timestamptz,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (account_id, source)
);

create table meta_posts_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  post_id       text not null,
  platform      text not null check (platform in ('facebook_page', 'instagram')),
  permalink     text,
  caption       text,
  published_at  timestamptz,
  reach         integer not null default 0,
  engagement    integer not null default 0,
  likes         integer not null default 0,
  comments      integer not null default 0,
  shares        integer not null default 0,
  primary key (account_id, snapshot_date, post_id)
);
create index on meta_posts_daily (account_id, snapshot_date);

create table meta_campaigns_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  campaign_id   text not null,
  campaign_name text not null,
  status        text,
  spend_cents   integer not null default 0,
  impressions   integer not null default 0,
  clicks        integer not null default 0,
  leads         integer not null default 0,
  primary key (account_id, snapshot_date, campaign_id)
);
create index on meta_campaigns_daily (account_id, snapshot_date);

create table content_calendar (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  project_id   text references projects(id) on delete set null,
  platform     text not null check (platform in ('facebook', 'instagram', 'other')),
  caption      text,
  scheduled_on date,
  owner_id     uuid references team_members(id),
  status       text not null default 'draft' check (status in ('draft', 'scheduled', 'approved', 'published')),
  permalink    text,
  created_at   timestamptz not null default now()
);
create index on content_calendar (account_id, scheduled_on);

create table utm_links (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  base_url   text not null,
  source     text not null,
  medium     text not null,
  campaign   text not null,
  term       text,
  content    text,
  built_url  text not null,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now()
);
create index on utm_links (account_id);

alter table meta_connections    enable row level security;
alter table meta_posts_daily    enable row level security;
alter table meta_campaigns_daily enable row level security;
alter table content_calendar    enable row level security;
alter table utm_links           enable row level security;

create policy meta_connections_read on meta_connections for select using (is_staff());
create policy meta_connections_write on meta_connections for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- Nobody edits these by hand — only the sync job writes them, via the
-- service role key, which bypasses RLS entirely. Same reasoning as
-- metric_snapshots/search_queries_daily in Stage 4.
create policy meta_posts_daily_read on meta_posts_daily for select using (is_staff());
create policy meta_campaigns_daily_read on meta_campaigns_daily for select using (is_staff());

-- Content calendar: any staff can see the plan; admins/managers manage
-- anyone's entries, a member can create/edit their own draft — same
-- self-write pattern as member_leave.
create policy content_calendar_read on content_calendar for select using (is_staff());
create policy content_calendar_write on content_calendar for all
  using (auth_member_role() in ('admin', 'manager') or owner_id = auth_member_id())
  with check (auth_member_role() in ('admin', 'manager') or owner_id = auth_member_id());

-- UTM links: a low-stakes utility, any staff can build and save one.
create policy utm_links_read on utm_links for select using (is_staff());
create policy utm_links_write on utm_links for all
  using (is_staff())
  with check (is_staff());

create trigger audit_meta_connections after insert or update or delete on meta_connections
  for each row execute function log_change();
create trigger audit_content_calendar after insert or update or delete on content_calendar
  for each row execute function log_change();
create trigger audit_utm_links after insert or update or delete on utm_links
  for each row execute function log_change();
