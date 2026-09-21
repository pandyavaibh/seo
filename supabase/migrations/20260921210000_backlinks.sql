-- =====================================================================
-- Stage 5 — Backlink production (free/manual tracking only)
--
-- Plan doc's `backlink` entity: "Prospect through indexed link, anchor,
-- cost, status." Built as a manual pipeline the same way Rankings
-- (keywords/keyword_checks) was built for Stage 4 — staff-entered, no
-- API, because the only automated way to get referring-domain counts
-- or authority scores (Domain Rating, DA) is a paid API (Ahrefs, Moz,
-- Majestic — see the plan doc's open decision list). Scope confirmed
-- with the user: free manual tracking only, no paid API.
--
-- This is a different thing from the existing offpage_runs table:
-- offpage_runs is a monthly tally by activity type against the
-- project's link_target (a quick count). backlinks is the actual
-- per-link pipeline — one row per prospect/placement, carried through
-- its own lifecycle, which offpage_runs was never designed to hold.
-- Both stay; the workspace's "Links live" progress tile still reads
-- offpage_runs.
-- =====================================================================

create type backlink_status as enum
  ('prospect', 'outreach', 'placed', 'declined', 'removed');

create table backlinks (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  domain        text not null,
  source_url    text,
  target_url    text,
  anchor_text   text,
  status        backlink_status not null default 'prospect',
  cost_cents    integer,
  contact_email text,
  notes         text,
  owner_id      uuid references team_members(id),
  placed_on     date,
  created_at    timestamptz not null default now()
);
create index on backlinks (project_id, status);

alter table backlinks enable row level security;

create policy backlinks_read on backlinks for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy backlinks_write on backlinks for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create trigger audit_backlinks after insert or update or delete on backlinks
  for each row execute function log_change();
