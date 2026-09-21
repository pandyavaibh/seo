-- =====================================================================
-- Time entries — hour logging per project per person
--
-- Pulled forward from Stage 2 at the user's explicit request: "Dedicated
-- Projects" (fixed-scope, not hourly-billed) still need to track how
-- many hours each team member spends on them per month, and each entry
-- needs its own note describing the work — not just an aggregate.
--
-- Deliberately minimal: no task_id (no `tasks`/template system yet, so
-- nothing to link to) and no approval workflow. The fuller Stage 2 task
-- engine (templates, recurring monthly work, per-task estimates) is
-- still a separate, later migration — this is just enough to answer
-- "how many hours did we spend on this project this month, by whom,
-- doing what."
-- =====================================================================

create table time_entries (
  id         uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  member_id  uuid not null references team_members(id),
  hours      numeric(5,2) not null check (hours > 0),
  worked_on  date not null default current_date,
  note       text not null,
  created_at timestamptz not null default now()
);
create index on time_entries (project_id, worked_on);
create index on time_entries (member_id, worked_on);

alter table time_entries enable row level security;

-- Same pattern as checklist_runs/offpage_runs: staff on the project (or
-- admin/manager) can read and log hours against it.
create policy time_entries_read on time_entries for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy time_entries_write on time_entries for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create trigger audit_time_entries after insert or update or delete on time_entries
  for each row execute function log_change();
