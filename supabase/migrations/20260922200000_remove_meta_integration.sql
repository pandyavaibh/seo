-- Removing the Meta/Instagram/Ads integration (Stage 6's meta_*
-- tables + sync). Never configured — meta_connections, meta_posts_daily
-- and meta_campaigns_daily all had zero rows, and the nightly-meta-sync
-- cron job had never done anything but fail harmlessly with "no access
-- token" — confirmed directly against the live database before
-- dropping. content_calendar and utm_links (from the same original
-- Stage 6 migration) are untouched: both are independent of the Meta
-- API and stay.
select cron.unschedule('nightly-meta-sync');

drop table meta_campaigns_daily;
drop table meta_posts_daily;
drop table meta_connections;
