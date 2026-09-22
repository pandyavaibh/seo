-- =====================================================================
-- Off-page recurring tasks + monthly notes — the real tool's Off-Page
-- & Backlinks tab has a fixed set of recurring checks below the
-- per-type activity table: two multi-instance ones (a weekly project
-- follow-up, and a backlink/indexing check every Friday — instance
-- dates depend on the month's actual calendar, computed client-side,
-- not stored) and four single-instance-per-month ones (keyword rank
-- checks on the 1st and 15th, "project status complete" due before
-- the 25th, and a monthly competitor backlink analysis). Plus a free-
-- text notes field for the month ("Blockers, findings, anything worth
-- flagging").
--
-- One table covers every recurring task: task_key identifies which of
-- the six, instance_key distinguishes week/Friday instances from each
-- other ('wk1'..'wk5', 'fri_4' etc.) and is just 'default' for the
-- four single-instance tasks. Same shape and RLS as offpage_runs
-- (staff on the project, or admin/manager).
-- =====================================================================

create table offpage_recurring_runs (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  month         text not null,
  task_key      text not null check (task_key in (
                  'weekly_follow_up', 'backlink_indexing_check',
                  'keyword_check_1st', 'keyword_check_15th',
                  'project_status_complete', 'competitor_backlink_analysis'
                )),
  instance_key  text not null default 'default',
  done          boolean not null default false,
  done_by       uuid references team_members(id),
  done_at       timestamptz,
  unique (project_id, month, task_key, instance_key)
);
create index on offpage_recurring_runs (project_id, month);

create table offpage_notes (
  project_id text not null references projects(id) on delete cascade,
  month      text not null,
  note       text,
  updated_at timestamptz not null default now(),
  primary key (project_id, month)
);

alter table offpage_recurring_runs enable row level security;
alter table offpage_notes          enable row level security;

create policy offpage_recurring_runs_read on offpage_recurring_runs for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy offpage_recurring_runs_write on offpage_recurring_runs for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create policy offpage_notes_read on offpage_notes for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy offpage_notes_write on offpage_notes for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create trigger audit_offpage_recurring_runs after insert or update or delete on offpage_recurring_runs
  for each row execute function log_change();
create trigger audit_offpage_notes after insert or update or delete on offpage_notes
  for each row execute function log_change();
