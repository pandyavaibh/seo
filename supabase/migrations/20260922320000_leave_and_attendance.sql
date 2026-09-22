-- Leave & Attendance tab, by request: "Each Team Add their Punch in
-- And punch out."
--
-- attendance_entries: one row per member per day (unique on
-- member_id, work_date) — punch in creates it, punch out fills
-- punch_out on the same row. Deliberately one session a day, not
-- multiple in/out pairs — matches the literal ask; a second
-- clock-in/out pair per day (e.g. a lunch break) isn't supported yet.
--
-- member_leave is the same table Stage 3's Capacity & strength page
-- used before that page was removed by request — the leave log itself
-- was never the problem, so it's rebuilt here verbatim rather than
-- redesigned, now as its own tab instead of a card on a removed page.
create table attendance_entries (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references team_members(id) on delete cascade,
  work_date  date not null default current_date,
  punch_in   timestamptz not null default now(),
  punch_out  timestamptz,
  note       text,
  unique (member_id, work_date)
);
create index on attendance_entries (member_id, work_date);

create table member_leave (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references team_members(id) on delete cascade,
  starts_on date not null,
  ends_on   date not null,
  kind      text not null default 'leave',   -- leave | holiday | sick
  note      text,
  check (ends_on >= starts_on)
);
create index on member_leave (member_id, starts_on);

alter table attendance_entries enable row level security;
alter table member_leave enable row level security;

-- Attendance: any staff can see today's/the team's punch times; a
-- member punches themselves in/out, admins/managers can correct anyone's.
create policy attendance_read on attendance_entries for select using (is_staff());
create policy attendance_write on attendance_entries for all
  using (auth_member_role() in ('admin', 'manager') or member_id = auth_member_id())
  with check (auth_member_role() in ('admin', 'manager') or member_id = auth_member_id());

-- Leave: any staff can see who's out; admins/managers manage anyone's,
-- a member can log their own — same policy Stage 3 used.
create policy member_leave_read on member_leave for select using (is_staff());
create policy member_leave_write on member_leave for all
  using (auth_member_role() in ('admin', 'manager') or member_id = auth_member_id())
  with check (auth_member_role() in ('admin', 'manager') or member_id = auth_member_id());

create trigger audit_attendance_entries after insert or update or delete on attendance_entries
  for each row execute function log_change();
create trigger audit_member_leave after insert or update or delete on member_leave
  for each row execute function log_change();
