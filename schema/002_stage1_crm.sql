-- =====================================================================
-- Stage 1–3 — CRM core, project/task engine, team capacity
-- Apply after 001_stage0_rls.sql. Add RLS policies for every new table
-- using the same helpers (is_admin, auth_member_role, is_assigned).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Stage 1 — accounts, contacts, deals, activity
-- ---------------------------------------------------------------------
create type account_health as enum ('healthy', 'watch', 'at_risk');

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  website       text,
  industry      text,
  health        account_health not null default 'healthy',
  retainer_cents integer,                    -- monthly, in minor units
  currency      text not null default 'USD',
  hours_budget  numeric(6,1),                -- contracted hours per month
  started_on    date,
  renewal_on    date,
  account_manager_id uuid references team_members(id),
  notes         text,
  created_at    timestamptz not null default now()
);
create index on accounts (renewal_on);

create table contacts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  role        text,
  email       text,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on contacts (account_id);

create type deal_stage as enum
  ('enquiry', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

create table deals (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references accounts(id) on delete set null,
  name          text not null,
  stage         deal_stage not null default 'enquiry',
  value_cents   integer,
  source        text,
  owner_id      uuid references team_members(id),
  expected_close date,
  lost_reason   text,
  created_at    timestamptz not null default now()
);
create index on deals (stage, expected_close);

create type activity_kind as enum
  ('call', 'meeting', 'email', 'note', 'report', 'issue');

create table activities (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  text references projects(id) on delete set null,
  kind        activity_kind not null default 'note',
  body        text not null,
  author_id   uuid references team_members(id),
  occurred_at timestamptz not null default now()
);
create index on activities (account_id, occurred_at desc);

-- Attach existing projects to accounts.
alter table projects add column account_id uuid references accounts(id);
alter table projects add column project_type text;      -- technical | content | offpage | local | migration | analytics
alter table projects add column stage text default 'discovery';
alter table projects add column due_on date;
alter table projects add column weekly_hours numeric(5,1);
alter table projects add column health text default 'ok'; -- ok | risk | late
create index on projects (account_id);

-- ---------------------------------------------------------------------
-- Stage 2 — templates, tasks, time entries
-- ---------------------------------------------------------------------
create table project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table template_tasks (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references project_templates(id) on delete cascade,
  idx           integer not null,
  label         text not null,
  default_role  text,                        -- which discipline usually owns it
  estimate_hours numeric(5,1),
  priority      text default 'normal',       -- low | normal | high
  recurrence    text                         -- null | monthly | weekly | friday
);
create index on template_tasks (template_id, idx);

create type task_status as enum ('todo', 'in_progress', 'blocked', 'done', 'na');

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  template_task_id uuid references template_tasks(id),
  label         text not null,
  status        task_status not null default 'todo',
  owner_id      uuid references team_members(id),
  estimate_hours numeric(5,1),
  due_on        date,
  priority      text default 'normal',
  month         text,                        -- 'YYYY-MM' for recurring work
  blocked_by    uuid references tasks(id),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index on tasks (project_id, status);
create index on tasks (owner_id, due_on);

create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references tasks(id) on delete cascade,
  project_id  text not null references projects(id) on delete cascade,
  member_id   uuid not null references team_members(id),
  hours       numeric(5,2) not null check (hours > 0),
  worked_on   date not null default current_date,
  note        text,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on time_entries (member_id, worked_on);
create index on time_entries (project_id, worked_on);

-- ---------------------------------------------------------------------
-- Stage 3 — capacity, skills, leave
-- ---------------------------------------------------------------------
alter table team_members add column weekly_capacity numeric(5,1) default 36;
alter table team_members add column cost_rate_cents integer;      -- internal hourly cost
alter table team_members add column active boolean default true;

create table member_skills (
  member_id  uuid not null references team_members(id) on delete cascade,
  discipline text not null,     -- technical | content | offpage | analytics | local | client
  level      smallint not null check (level between 1 and 5),
  primary key (member_id, discipline)
);

create table member_leave (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references team_members(id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  kind       text default 'leave',   -- leave | holiday | sick
  note       text
);
create index on member_leave (member_id, starts_on);

-- Allocation: hours per week a member is committed to a project.
alter table assignments add column weekly_hours numeric(5,1) default 0;
alter table assignments add column starts_on date;
alter table assignments add column ends_on date;

-- ---------------------------------------------------------------------
-- Booked hours per member, used by the capacity screen.
-- ---------------------------------------------------------------------
create or replace view member_load as
select
  m.id                as member_id,
  m.name,
  m.weekly_capacity,
  coalesce(sum(a.weekly_hours), 0) as booked_hours,
  case when m.weekly_capacity > 0
       then round(coalesce(sum(a.weekly_hours), 0) / m.weekly_capacity, 2)
       else 0 end     as ratio,
  count(a.project_id) as project_count
from team_members m
left join assignments a on a.member_id = m.id
left join projects   p on p.id = a.project_id and p.stage <> 'shipped'
where m.active
group by m.id, m.name, m.weekly_capacity;

-- ---------------------------------------------------------------------
-- Stage 4 preview — keep this table lean, it is the only one with volume.
-- Daily rows for 90 days, then roll up into monthly and delete the dailies.
-- ---------------------------------------------------------------------
-- create table metric_snapshots (
--   account_id  uuid not null references accounts(id) on delete cascade,
--   source      text not null,          -- gsc | ga4 | meta
--   grain       text not null,          -- day | month
--   period      date not null,
--   clicks      integer,
--   impressions integer,
--   ctr         numeric(6,4),
--   position    numeric(6,2),
--   sessions    integer,
--   conversions integer,
--   primary key (account_id, source, grain, period)
-- );
