-- Portal dashboard gets three more at-a-glance widgets: Organic Traffic
-- (Search Console clicks/impressions), a Backlink Counter (from the
-- real per-link `backlinks` pipeline, not the off-page activity tally),
-- and Keywords in top 10 — plus a "Client Conversation" preview card
-- surfacing the latest portal_comments message above the full thread.
--
-- None of the tables behind these were ever client-readable:
-- search_connections/metric_snapshots were is_staff()-only (Stage 4),
-- and backlinks/keywords/keyword_checks were staff-or-assigned-only
-- (Stage 4/5, project-scoped, no account-level client clause). Widened
-- the same way every other portal-visible table already was in Stage 7
-- (reports/invoices/deliverables/portal_comments): an additional
-- `account_id = auth_member_account_id()` (or, for the project-scoped
-- tables, a join through projects.account_id) on the *_read policy
-- only — write access stays staff-only, unchanged.
create or replace function is_own_account_project(p_project_id text) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from projects where id = p_project_id and account_id = auth_member_account_id()
  );
$$;

alter policy search_connections_read on search_connections
  using (is_staff() or account_id = auth_member_account_id());

alter policy metric_snapshots_read on metric_snapshots
  using (is_staff() or account_id = auth_member_account_id());

alter policy backlinks_read on backlinks
  using (
    auth_member_role() in ('admin', 'manager') or is_assigned(project_id) or is_own_account_project(project_id)
  );

alter policy keywords_read on keywords
  using (
    auth_member_role() in ('admin', 'manager') or is_assigned(project_id) or is_own_account_project(project_id)
  );

alter policy keyword_checks_read on keyword_checks
  using (
    auth_member_role() in ('admin', 'manager') or is_assigned(project_id) or is_own_account_project(project_id)
  );
