-- =====================================================================
-- Stage 1 — CRM core: accounts, contacts, deals, activity timeline
--
-- Scope is deliberately narrower than schema/002_stage1_crm.sql, which
-- bundles Stages 1–3 in one reference file. This migration applies only
-- the Stage 1 portion (accounts/contacts/deals/activities + attaching
-- projects to accounts) — Stage 2 (templates, tasks, time entries) and
-- Stage 3 (skills, leave, capacity) come later, in their own migrations,
-- per "work stage by stage."
--
-- Access model: accounts/contacts/deals/activities hold commercial data
-- (retainer value, deal value, account manager) — scoped to admin/manager
-- only for now, not every assigned member. Loosen later (e.g. read access
-- for assigned members) if the product actually needs it.
-- =====================================================================

create type account_health as enum ('healthy', 'watch', 'at_risk');

create table accounts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  website            text,
  industry           text,
  health             account_health not null default 'healthy',
  retainer_cents     integer,                    -- monthly, in minor units
  currency           text not null default 'USD',
  hours_budget       numeric(6,1),                -- contracted hours per month
  started_on         date,
  renewal_on         date,
  account_manager_id uuid references team_members(id),
  notes              text,
  created_at         timestamptz not null default now()
);
create index on accounts (renewal_on);

create table contacts (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name       text not null,
  role       text,
  email      text,
  phone      text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on contacts (account_id);

create type deal_stage as enum
  ('enquiry', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

create table deals (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid references accounts(id) on delete set null,
  name           text not null,
  stage          deal_stage not null default 'enquiry',
  value_cents    integer,
  source         text,
  owner_id       uuid references team_members(id),
  expected_close date,
  lost_reason    text,
  created_at     timestamptz not null default now()
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

-- Attach existing projects to accounts. `status` (active/paused/shipped,
-- from the baseline) stays as the operational flag; `stage` is the new
-- delivery-pipeline concept (discovery/in progress/client review/shipped)
-- the Account record and Project workspace screens use — deliberately
-- separate columns, not a rename.
alter table projects add column account_id uuid references accounts(id);
alter table projects add column project_type text;      -- technical | content | offpage | local | migration | analytics
alter table projects add column stage text default 'discovery';
alter table projects add column due_on date;
alter table projects add column weekly_hours numeric(5,1);
alter table projects add column health text default 'ok'; -- ok | risk | late
create index on projects (account_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table accounts   enable row level security;
alter table contacts   enable row level security;
alter table deals      enable row level security;
alter table activities enable row level security;

create policy accounts_read on accounts for select using (
  auth_member_role() in ('admin', 'manager')
);
create policy accounts_write on accounts for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy contacts_read on contacts for select using (
  auth_member_role() in ('admin', 'manager')
);
create policy contacts_write on contacts for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy deals_read on deals for select using (
  auth_member_role() in ('admin', 'manager')
);
create policy deals_write on deals for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy activities_read on activities for select using (
  auth_member_role() in ('admin', 'manager')
);
create policy activities_write on activities for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- ---------------------------------------------------------------------
-- Audit log — same log_change() trigger function from Stage 0.5. The
-- existing audit_projects trigger already covers the new projects
-- columns above; no change needed there.
-- ---------------------------------------------------------------------
create trigger audit_accounts   after insert or update or delete on accounts
  for each row execute function log_change();
create trigger audit_contacts   after insert or update or delete on contacts
  for each row execute function log_change();
create trigger audit_deals      after insert or update or delete on deals
  for each row execute function log_change();
create trigger audit_activities after insert or update or delete on activities
  for each row execute function log_change();
