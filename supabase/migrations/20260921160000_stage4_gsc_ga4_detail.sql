-- =====================================================================
-- Stage 4 (detail expansion) — full GSC/GA4 breakdowns
--
-- Extends 20260921150000_stage4_search_performance.sql with the
-- dimensional data the core slice deliberately cut: GSC pages,
-- countries, devices (all from the same searchAnalytics.query endpoint
-- already in use, just different `dimensions`); GA4 channel and
-- landing-page breakdowns (from the same runReport endpoint).
--
-- Same shape and rationale as search_queries_daily: pages/countries/
-- devices are aggregated over the trailing 28-day window and written
-- once per sync as a single "today" snapshot (not true daily-per-page
-- rows — cardinality would explode for no benefit at this scale).
-- ga4_channels_daily IS true daily-per-channel (channel cardinality is
-- low, ~5-10 groups, and a channel trend is actually useful).
--
-- Deliberately still NOT built, and not attempted here:
-- - Core Web Vitals: not part of the Search Analytics API at all — it's
--   the Chrome UX Report (CrUX) API, a separate Google product with its
--   own API-key auth (not the service account's OAuth scopes). A real
--   second integration, not a field to add to this one.
-- - Index coverage, validation status, manual actions, security
--   issues: Search Console does not expose these through any public
--   API — they're Search Console UI/report-only. Nothing to sync;
--   faking them would violate the app's own no-fabricated-data rule.
-- - GA4 "assisted conversions": a Universal Analytics multi-channel-
--   funnels concept with no equivalent metric in GA4's data model —
--   not a gap, there's nothing there to pull.
-- =====================================================================

create table search_pages_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  page          text not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric not null default 0,
  avg_position  numeric not null default 0,
  primary key (account_id, snapshot_date, page)
);
create index on search_pages_daily (account_id, snapshot_date);

create table search_countries_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  country       text not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric not null default 0,
  avg_position  numeric not null default 0,
  primary key (account_id, snapshot_date, country)
);
create index on search_countries_daily (account_id, snapshot_date);

create table search_devices_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  device        text not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric not null default 0,
  avg_position  numeric not null default 0,
  primary key (account_id, snapshot_date, device)
);
create index on search_devices_daily (account_id, snapshot_date);

create table ga4_channels_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  channel       text not null,
  sessions      integer not null default 0,
  conversions   integer not null default 0,
  primary key (account_id, snapshot_date, channel)
);
create index on ga4_channels_daily (account_id, snapshot_date);

create table ga4_landing_pages_daily (
  account_id       uuid not null references accounts(id) on delete cascade,
  snapshot_date    date not null,
  landing_page     text not null,
  sessions         integer not null default 0,
  engaged_sessions integer not null default 0,
  conversions      integer not null default 0,
  primary key (account_id, snapshot_date, landing_page)
);
create index on ga4_landing_pages_daily (account_id, snapshot_date);

alter table search_pages_daily      enable row level security;
alter table search_countries_daily  enable row level security;
alter table search_devices_daily    enable row level security;
alter table ga4_channels_daily      enable row level security;
alter table ga4_landing_pages_daily enable row level security;

-- Same as metric_snapshots/search_queries_daily: staff read, no write
-- policy at all — only the sync job (service role, bypasses RLS) writes.
create policy search_pages_daily_read      on search_pages_daily      for select using (is_staff());
create policy search_countries_daily_read  on search_countries_daily  for select using (is_staff());
create policy search_devices_daily_read    on search_devices_daily    for select using (is_staff());
create policy ga4_channels_daily_read      on ga4_channels_daily      for select using (is_staff());
create policy ga4_landing_pages_daily_read on ga4_landing_pages_daily for select using (is_staff());
