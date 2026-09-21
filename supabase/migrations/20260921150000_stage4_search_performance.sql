-- =====================================================================
-- Stage 4 (core slice) — Search performance: GSC and GA4
--
-- Deviates from the original plan doc (designs/SEO CRM Development
-- Plan.dc.html, Stage 4 section), which called for each account
-- connecting its own Google property via OAuth. Decided instead, with
-- sign-off, on a single shared Google Cloud service account: VR
-- Bonkers staff add that service account as a user on each client's
-- Search Console property (Settings -> Users and permissions) and as
-- a Viewer on each client's GA4 property (Admin -> Property Access
-- Management). One nightly job then syncs every account. No OAuth
-- consent flow, no per-account refresh tokens to store or rotate, and
-- it matches how every other integration in this app is
-- staff-managed rather than client-self-service.
--
-- search_connections holds, per account and per source, which Google
-- property to pull and whether the service account currently has
-- access (flipped to 'granted' by the sync job on its first
-- successful pull, not by anything the user clicks).
--
-- metric_snapshots is deliberately a narrow key/value table
-- (account_id, source, date, metric_key -> value), matching the plan
-- doc's single generic `metric_snapshot` entity ("Daily GSC / GA4 /
-- Meta figures per account, stored locally") so Stage 5's Meta
-- numbers land in the same table without a schema change. It holds
-- site-wide daily totals only (gsc: clicks/impressions/ctr/
-- avg_position, ga4: sessions/conversions) — the account record's
-- restored stat tiles and the trend chart are built from this.
--
-- search_queries_daily is separate (not metric_snapshots rows) because
-- it's dimensional — one row per query per day, not one number — and
-- only applies to Search Console.
--
-- Deliberately cut from this core slice: Core Web Vitals (a different
-- Google API — CrUX/PageSpeed Insights, not Search Analytics — and a
-- separate auth story; not worth bundling into the first real pull),
-- device split, and GA4 channel breakdown. The design mock showed all
-- of these; this migration ships what the sync job actually fetches
-- first. Documented in docs/STAGE_4.md, same pattern as every other
-- stage's cuts.
--
-- Nobody edits metric_snapshots or search_queries_daily by hand — only
-- the sync job writes them, via the service role key, which bypasses
-- RLS entirely. So neither table gets a write policy: RLS stays on
-- with read-only access for staff, which is what "enable row level
-- security" + a single select policy means in Postgres. Only
-- search_connections (config, not ingested data) is staff-writable
-- and audit-logged.
-- =====================================================================

create table search_connections (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  source          text not null check (source in ('gsc', 'ga4')),
  property        text not null,   -- gsc: site URL as registered in Search Console; ga4: "properties/<id>"
  status          text not null default 'needs_access' check (status in ('needs_access', 'granted')),
  last_checked_at timestamptz,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (account_id, source)
);

create table metric_snapshots (
  account_id    uuid not null references accounts(id) on delete cascade,
  source        text not null check (source in ('gsc', 'ga4')),
  snapshot_date date not null,
  metric_key    text not null,
  value         numeric not null,
  primary key (account_id, source, snapshot_date, metric_key)
);
create index on metric_snapshots (account_id, source, snapshot_date);

create table search_queries_daily (
  account_id    uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  query         text not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric not null default 0,
  avg_position  numeric not null default 0,
  primary key (account_id, snapshot_date, query)
);
create index on search_queries_daily (account_id, snapshot_date);

alter table search_connections    enable row level security;
alter table metric_snapshots      enable row level security;
alter table search_queries_daily  enable row level security;

create policy search_connections_read on search_connections for select using (is_staff());
create policy search_connections_write on search_connections for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy metric_snapshots_read on metric_snapshots for select using (is_staff());
create policy search_queries_daily_read on search_queries_daily for select using (is_staff());

create trigger audit_search_connections after insert or update or delete on search_connections
  for each row execute function log_change();
