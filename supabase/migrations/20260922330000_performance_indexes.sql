-- Performance advisor cleanup: covering indexes for every unindexed
-- foreign key the linter flagged, plus one RLS policy that was
-- re-evaluating auth.jwt() per row instead of once per query.
--
-- Deliberately NOT touching two other advisor items:
-- - unused_index (9 INFO findings): every index here is brand new or
--   on a low-traffic table; "unused so far" isn't a reason to drop one
--   on an app that's barely been used yet.
-- - multiple_permissive_policies (135 WARN findings): this is the
--   is_staff()-read + admin/manager-write shape used everywhere in
--   this app, by design (Stage 0's RLS model). "Fixing" it means
--   collapsing two policies into one OR'd condition per table/action,
--   repo-wide — high blast radius for a cosmetic cost that only
--   matters at a row-count scale this app (5 accounts, 6 staff) is
--   nowhere near. Not worth the risk here.

create index on accounts (account_manager_id);
create index on activities (author_id);
create index on activities (project_id);
create index on checklist_runs (done_by);
create index on checklist_runs (template_item_id);
create index on content_calendar (owner_id);
create index on content_calendar (project_id);
create index on deliverables (created_by);
create index on deliverables (project_id);
create index on expenses (created_by);
create index on expenses (project_id);
create index on keyword_checks (checked_by);
create index on offpage_activity_entries (created_by);
create index on offpage_recurring_runs (done_by);
create index on portal_comments (author_id);
create index on reports (generated_by);
create index on team_members (account_id);
create index on technical_audits (run_by);

-- auth.jwt() was called per row instead of once per query (Postgres
-- can't cache a bare function call across rows, only a scalar
-- subquery) — wrap it so the planner evaluates it once.
alter policy team_read on team_members
  using (is_staff() or email = lower((select auth.jwt()) ->> 'email'));
