-- =====================================================================
-- Baseline schema — reconstructed starting point
--
-- IMPORTANT: this migration exists because no real Supabase project or
-- copy of the production `index.html` was available when Stage 0 was
-- built. There is supposed to be exactly one database for this app —
-- the one already running the legacy tracker in production. This file
-- is NOT that database's real schema; it is a best-effort reconstruction
-- from the product description (team_members + roles, projects,
-- assignments, a monthly per-project checklist, an off-page module with
-- a 200-link/month target across 16 activity types, and a keyword
-- rank-check log) so Stage 0's RLS/audit work has something concrete to
-- sit on top of.
--
-- BEFORE applying anything in this repo to the real production project:
--   1. Run `supabase db pull` against the real project instead of this
--      file, so migrations start from the actual schema.
--   2. Diff that pulled schema against this file and reconcile table
--      and column names — the RLS migration that follows
--      (20260919100100_stage0_roles_rls_audit.sql) assumes exactly the
--      table/column names used here.
--   3. Once reconciled, this file can be discarded in favour of the
--      real baseline.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- team_members — the allowlist. Membership in this table (matched by
-- email against the Google-auth JWT) is what "signed in" means for RLS
-- purposes; role starts as free text here and becomes a real enum in
-- the next migration.
-- ---------------------------------------------------------------------
create table team_members (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text not null,
  role       text not null default 'member',   -- becomes member_role enum next migration
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- projects — one SEO engagement. id is text (not uuid) because the
-- legacy app is understood to use short project codes as primary keys,
-- and every later Stage 0/1 reference (assignments, checklist_runs,
-- offpage_runs, keywords, keyword_checks, and Stage 1's tasks/
-- time_entries) is written against a text project_id.
-- ---------------------------------------------------------------------
create table projects (
  id           text primary key,
  name         text not null,
  client_name  text,                            -- freeform until Stage 1 adds accounts.id
  status       text not null default 'active',  -- active | paused | shipped
  link_target  integer not null default 200,     -- monthly off-page link target
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- assignments — who is staffed on which project.
-- ---------------------------------------------------------------------
create table assignments (
  id         uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  member_id  uuid not null references team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, member_id)
);
create index on assignments (member_id);
create index on assignments (project_id);

-- ---------------------------------------------------------------------
-- checklist_template_items — the fixed monthly sitewide checklist.
-- ---------------------------------------------------------------------
create table checklist_template_items (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   text,
  sort_order integer not null default 0,
  active     boolean not null default true
);

-- ---------------------------------------------------------------------
-- checklist_runs — one row per project × template item × month. Holds
-- the completion state and the note field whose 650ms-debounced save is
-- the source of Stage 0.3's re-render data-loss bug.
-- ---------------------------------------------------------------------
create table checklist_runs (
  id               uuid primary key default gen_random_uuid(),
  project_id       text not null references projects(id) on delete cascade,
  template_item_id uuid not null references checklist_template_items(id) on delete cascade,
  month            text not null,                -- 'YYYY-MM'
  done             boolean not null default false,
  note             text,
  done_by          uuid references team_members(id),
  done_at          timestamptz,
  updated_at       timestamptz not null default now(),
  unique (project_id, template_item_id, month)
);
create index on checklist_runs (project_id, month);

-- ---------------------------------------------------------------------
-- offpage_runs — one row per project × month × activity type, counted
-- against the project's monthly link target across 16 activity types.
-- ---------------------------------------------------------------------
create table offpage_runs (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references projects(id) on delete cascade,
  month         text not null,                   -- 'YYYY-MM'
  activity_type text not null,
  count         integer not null default 0,
  updated_by    uuid references team_members(id),
  updated_at    timestamptz not null default now(),
  unique (project_id, month, activity_type)
);
create index on offpage_runs (project_id, month);

-- ---------------------------------------------------------------------
-- keywords / keyword_checks — tracked phrases per project and their
-- rank-check history. project_id is denormalised onto keyword_checks so
-- RLS policies can scope by assignment without a join.
-- ---------------------------------------------------------------------
create table keywords (
  id         uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  phrase     text not null,
  target_url text,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
create index on keywords (project_id);

create table keyword_checks (
  id         uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references keywords(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  rank       integer,
  checked_on date not null default current_date,
  checked_by uuid references team_members(id),
  created_at timestamptz not null default now()
);
create index on keyword_checks (project_id, checked_on);
create index on keyword_checks (keyword_id, checked_on);
