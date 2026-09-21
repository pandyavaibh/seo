-- =====================================================================
-- Project-level KPI/OKR report
--
-- Covers the four pieces scoped earlier: keyword rankings vs targets
-- (keywords.target_rank — the Rankings section already shows current
-- rank; this adds the "vs what"), traffic & conversions vs goals
-- (projects.traffic_goal_clicks/conversions_goal — compared against
-- the account's real Stage 4 numbers), hours vs budget (already exists
-- on the workspace's "This month" card, not duplicated here), and
-- custom KPI/OKR fields (project_goals — a free-form label/target/
-- current/unit row the app doesn't try to compute for you, since a
-- "custom" metric by definition isn't one the schema already knows how
-- to derive).
--
-- Honesty note: traffic/conversions are tracked per ACCOUNT in Stage 4
-- (one Search Console/GA4 property per account, not per engagement) —
-- there's no real per-project traffic split when an account runs
-- multiple simultaneous engagements. The UI labels this "account-wide"
-- rather than pretending it's attributable to just this project.
-- =====================================================================

alter table keywords add column target_rank integer;

alter table projects add column traffic_goal_clicks integer;
alter table projects add column conversions_goal integer;

create table project_goals (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  label         text not null,
  target_value  numeric,
  current_value numeric,
  unit          text,
  created_at    timestamptz not null default now()
);
create index on project_goals (project_id);

alter table project_goals enable row level security;

create policy project_goals_read on project_goals for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy project_goals_write on project_goals for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create trigger audit_project_goals after insert or update or delete on project_goals
  for each row execute function log_change();
