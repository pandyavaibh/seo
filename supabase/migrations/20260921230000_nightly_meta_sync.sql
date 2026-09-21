-- =====================================================================
-- Nightly Stage 6 auto-sync
--
-- Same shape as 20260921190000_nightly_search_sync.sql, for
-- sync-meta-performance instead of sync-search-performance. Reuses the
-- same internal_config.cron_sync_secret rather than generating a
-- second one — it's a shared internal call-authentication token
-- between pg_cron and every Edge Function here, not per-integration.
--
-- Until META_ACCESS_TOKEN exists as an Edge Function secret, this job
-- runs every night and does nothing useful (each account's sync fails
-- with the same "not set" error the function always throws) —
-- harmless, and it starts working the moment that secret is added.
-- =====================================================================

select cron.schedule(
  'nightly-meta-sync',
  '15 3 * * *', -- 03:15 UTC, staggered after the search sync
  $$
  select net.http_post(
    url := 'https://bmlvurfoksjlckrubehn.supabase.co/functions/v1/sync-meta-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from internal_config where key = 'cron_sync_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
