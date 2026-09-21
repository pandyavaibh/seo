-- =====================================================================
-- Nightly Stage 4 auto-sync
--
-- Deferred in 20260921150000_stage4_search_performance.sql: "pg_cron
-- calling this per-account needs a service-role invocation path this
-- function doesn't implement yet." Building that path now.
--
-- internal_config is a single locked-down table (RLS enabled, zero
-- policies — deny-all to anon/authenticated; only the service role,
-- which every server-side actor here already uses, bypasses RLS) that
-- holds a random secret this migration generates itself. It's an
-- internal call-authentication token between pg_cron and the Edge
-- Function, not a third-party credential — nothing like the Google
-- service account key, which only the user can create. pg_net (async
-- HTTP from Postgres) is what lets the nightly cron job actually reach
-- the Edge Function's URL.
--
-- Until GOOGLE_SERVICE_ACCOUNT_KEY exists as an Edge Function secret,
-- this job runs every night and does nothing useful (each account's
-- sync fails with that same "not set" error the function has always
-- thrown) — harmless, and it starts working the moment that secret is
-- added, with no further migration needed.
-- =====================================================================

create extension if not exists pg_net;

create table internal_config (
  key   text primary key,
  value text not null
);
alter table internal_config enable row level security;
-- No policies at all: deny-all for anon/authenticated. Only the
-- service role (Edge Functions, this migration itself) can read or
-- write it.

insert into internal_config (key, value)
values ('cron_sync_secret', encode(gen_random_bytes(24), 'hex'));

select cron.schedule(
  'nightly-search-sync',
  '0 3 * * *', -- 03:00 UTC
  $$
  select net.http_post(
    url := 'https://bmlvurfoksjlckrubehn.supabase.co/functions/v1/sync-search-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from internal_config where key = 'cron_sync_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
