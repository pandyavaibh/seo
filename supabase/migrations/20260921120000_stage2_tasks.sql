-- =====================================================================
-- Stage 2 (core slice) — tasks, and hour logging tied to a task
--
-- Scoped to what the Project workspace screen in
-- docs/DESIGN_HANDOFF.md actually needs: a task list with per-task
-- logged/estimate hours and a manual "Add task" flow. The template
-- library (project_templates/template_tasks) and auto-generated
-- recurring monthly instances are cut for now — that needs a scheduled
-- job (pg_cron/Edge Function) to generate instances on the 1st, which
-- is real additional infrastructure, not just a table. Add it when
-- recurring generation is actually being built, per "work stage by
-- stage."
-- =====================================================================

create type task_status as enum ('todo', 'in_progress', 'blocked', 'done', 'na');

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     text not null references projects(id) on delete cascade,
  label          text not null,
  status         task_status not null default 'todo',
  owner_id       uuid references team_members(id),
  estimate_hours numeric(5,1),
  due_on         date,
  priority       text default 'normal',        -- low | normal | high
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index on tasks (project_id, status);
create index on tasks (owner_id, due_on);

alter table time_entries add column task_id uuid references tasks(id) on delete set null;
create index on time_entries (task_id);

alter table tasks enable row level security;

create policy tasks_read on tasks for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy tasks_write on tasks for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create trigger audit_tasks after insert or update or delete on tasks
  for each row execute function log_change();
