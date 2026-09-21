-- =====================================================================
-- Stage 3 — capacity, skills, leave
--
-- Follows schema/002_stage1_crm.sql's real production model (per-
-- assignment weekly hours + a capacity figure per person), not the
-- design prototype's shortcut (deriving booked hours from
-- project.hours / team size) — the prototype's mock logic isn't real
-- data to build the actual screen on.
--
-- Deliberately excludes team_members.cost_rate_cents from the original
-- reference file: nothing in the Capacity & strength screen's design
-- uses it, and adding it would leak every member's internal hourly
-- cost to any staff account under the existing team_read policy
-- (is_staff() — any signed-in team member), directly contradicting the
-- roles doc ("Member... cannot view rates"). Add it later behind its
-- own admin-only-readable table if a profitability feature actually
-- needs it (Stage 7).
--
-- team_members.active already exists (added in the Stage 0 baseline),
-- so it's not re-added here.
-- =====================================================================

alter table team_members add column weekly_capacity numeric(5,1) not null default 36;

create table member_skills (
  member_id  uuid not null references team_members(id) on delete cascade,
  discipline text not null,     -- technical | content | offpage | analytics | local | client
  level      smallint not null check (level between 1 and 5),
  primary key (member_id, discipline)
);

create table member_leave (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references team_members(id) on delete cascade,
  starts_on date not null,
  ends_on   date not null,
  kind      text default 'leave',   -- leave | holiday | sick
  note      text,
  check (ends_on >= starts_on)
);
create index on member_leave (member_id, starts_on);

-- Allocation: hours per week a member is committed to a project.
alter table assignments add column weekly_hours numeric(5,1) not null default 0;
alter table assignments add column starts_on date;
alter table assignments add column ends_on date;

alter table member_skills enable row level security;
alter table member_leave  enable row level security;

-- Skills: any staff can see the matrix; admins and managers set ratings.
create policy member_skills_read on member_skills for select using (is_staff());
create policy member_skills_write on member_skills for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- Leave: any staff can see who's out; admins/managers manage anyone's,
-- a member can log their own.
create policy member_leave_read on member_leave for select using (is_staff());
create policy member_leave_write on member_leave for all
  using (
    auth_member_role() in ('admin', 'manager') or member_id = auth_member_id()
  )
  with check (
    auth_member_role() in ('admin', 'manager') or member_id = auth_member_id()
  );

create trigger audit_member_skills after insert or update or delete on member_skills
  for each row execute function log_change();
create trigger audit_member_leave after insert or update or delete on member_leave
  for each row execute function log_change();
