-- Off-page activity logging goes date-wise: instead of one mutable
-- "done this month" count per project/activity_type, staff log dated
-- entries (e.g. "Sep 2 — +4 Guest Posts") and "done"/"remaining" are
-- computed by summing entries within the viewed month, exactly the
-- worked example the user gave (Sep 2 +4 => 16 left, Sep 7 +6 => 10
-- left, Sep 14 +6 => 4 left, against a target of 20).
create table offpage_activity_entries (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  activity_type text not null,
  entry_date    date not null,
  count         integer not null check (count > 0),
  note          text,
  created_by    uuid references team_members(id),
  created_at    timestamptz not null default now()
);
create index on offpage_activity_entries (project_id, activity_type, entry_date);

alter table offpage_activity_entries enable row level security;

-- Same "staff on the project, or admin/manager" pattern as offpage_runs.
create policy offpage_entries_read on offpage_activity_entries for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy offpage_entries_write on offpage_activity_entries for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create trigger audit_offpage_activity_entries after insert or update or delete on offpage_activity_entries
  for each row execute function log_change();

-- Backfill: one entry per existing offpage_runs row, dated the 1st of
-- its month (the finest-grained date that row ever recorded).
insert into offpage_activity_entries (project_id, activity_type, entry_date, count, created_by, created_at)
select project_id, activity_type, (month || '-01')::date, count, updated_by, updated_at
from offpage_runs
where count > 0;

drop table offpage_runs;
