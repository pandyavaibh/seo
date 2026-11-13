-- =====================================================================
-- Stage 10 — in-house team work & management
--
-- Prompted directly: "improve SEO CRM that best in Industries for in
-- house team work and management." Scoped by request to three areas:
-- workload & capacity, task management, performance/productivity
-- reporting. Deliberately NOT reviving the old Capacity & strength
-- page (skills matrix, `member_leave`) or Leave & Attendance — both
-- were built earlier this project and removed by request for sitting
-- empty/unused. This is new, purpose-built capability, not a revival.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Workload & capacity — one new column. Everything else (assigned
-- hours, logged hours) already exists (`assignments.weekly_hours`,
-- `time_entries`); the only missing piece was "how many hours is this
-- person actually expected to work," which the old `weekly_capacity`
-- column (dropped in 20260922240000_remove_capacity_and_leads.sql)
-- used to hold before that whole page was cut.
-- ---------------------------------------------------------------------
alter table team_members add column weekly_capacity_hours numeric(5,2);
comment on column team_members.weekly_capacity_hours is
  'Admin-set expected hours/week. Null means "not set yet" — workload views show that explicitly rather than treating it as zero capacity.';

-- ---------------------------------------------------------------------
-- Task management — a real, lightweight to-do system. Not the old
-- per-project "+1h quick log" Tasks table (gone, along with task_id on
-- time_entries) — this is personal/team work tracking, optionally
-- linked to a client or engagement, not required to be.
-- ---------------------------------------------------------------------
create type task_status as enum ('to_do', 'in_progress', 'done');
create type task_priority as enum ('high', 'medium', 'low');

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  notes        text,
  status       task_status not null default 'to_do',
  priority     task_priority not null default 'medium',
  assignee_id  uuid references team_members(id) on delete set null,
  account_id   uuid references accounts(id) on delete cascade,
  project_id   text references projects(id) on delete cascade,
  due_on       date,
  created_by   uuid references team_members(id),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on tasks (assignee_id, status);
create index on tasks (account_id);
create index on tasks (project_id);
create index on tasks (due_on);

alter table tasks enable row level security;

-- A task is personal work, not project-scoped the way checklist_runs/
-- time_entries are — so this reads "assigned to me, or I created it,
-- or I'm admin/manager" rather than is_assigned(project_id). Staff
-- read each other's tasks too (same as team_members/assignments
-- already do) so a manager building Team Tasks isn't blocked, but
-- write stays narrower: edit/complete your own, or whatever you
-- created, or admin/manager.
create policy tasks_read on tasks for select using (is_staff());
create policy tasks_write on tasks for all
  using (
    is_staff()
    and (
      assignee_id = auth_member_id()
      or created_by = auth_member_id()
      or auth_member_role() in ('admin', 'manager')
    )
  )
  with check (is_staff());

create trigger audit_tasks after insert or update or delete on tasks
  for each row execute function log_change();
