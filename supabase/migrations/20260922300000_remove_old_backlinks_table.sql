-- The old per-link prospecting table (domain/status pipeline/cost/owner)
-- lived only on the now-retired Project workspace page and had 0 rows.
-- It's superseded by the new "Backlinks" activity group (dated,
-- dropdown-logged, target/left tracking) added in
-- 20260922290000_client_activities.sql.
drop table if exists backlinks;
drop type if exists backlink_status;
