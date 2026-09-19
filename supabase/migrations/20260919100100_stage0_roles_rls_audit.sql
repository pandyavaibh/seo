-- =====================================================================
-- Stage 0.1 + 0.5 — roles, row-level security, audit log
--
-- Adapted from schema/001_stage0_rls.sql against the baseline schema in
-- 20260919100000_baseline_schema.sql. Apply to STAGING first. Test by
-- signing in with a Google account that is NOT in team_members and
-- confirming every select below returns zero rows, then apply to
-- production.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Roles as a real type
-- ---------------------------------------------------------------------
create type member_role as enum ('admin', 'manager', 'member', 'client');

alter table team_members
  alter column role type member_role using role::member_role;

alter table team_members
  alter column role set default 'member';

-- ---------------------------------------------------------------------
-- 2. Helper functions (security definer so policies can call them)
-- ---------------------------------------------------------------------
create or replace function auth_member_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from team_members
  where lower(email) = lower(auth.jwt() ->> 'email') and active;
$$;

create or replace function auth_member_role() returns member_role
  language sql stable security definer set search_path = public as $$
  select role from team_members
  where lower(email) = lower(auth.jwt() ->> 'email') and active;
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(auth_member_role() = 'admin', false);
$$;

create or replace function is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(auth_member_role() in ('admin', 'manager', 'member'), false);
$$;

create or replace function is_assigned(p_project_id text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments a
    where a.project_id = p_project_id
      and a.member_id = auth_member_id());
$$;

-- ---------------------------------------------------------------------
-- 3. Enable RLS everywhere. Nothing is readable until a policy says so.
-- ---------------------------------------------------------------------
alter table team_members             enable row level security;
alter table projects                 enable row level security;
alter table assignments              enable row level security;
alter table checklist_template_items enable row level security;
alter table checklist_runs           enable row level security;
alter table offpage_runs             enable row level security;
alter table keywords                 enable row level security;
alter table keyword_checks           enable row level security;

-- ---------------------------------------------------------------------
-- 4. Policies
-- ---------------------------------------------------------------------

-- team_members: any staff member can see the roster; only admins change it.
create policy team_read   on team_members for select using (is_staff());
create policy team_write  on team_members for all
  using (is_admin()) with check (is_admin());

-- projects: admins and managers see all; members see what they are on.
create policy projects_read on projects for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(id)
);
create policy projects_write on projects for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- assignments: staff can read; admins and managers can change.
create policy assignments_read  on assignments for select using (is_staff());
create policy assignments_write on assignments for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- checklist template: staff read, admin write.
create policy template_read  on checklist_template_items for select using (is_staff());
create policy template_write on checklist_template_items for all
  using (is_admin()) with check (is_admin());

-- delivery data: readable and writable by people on the project.
create policy runs_read on checklist_runs for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy runs_write on checklist_runs for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create policy offpage_read on offpage_runs for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy offpage_write on offpage_runs for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create policy keywords_read on keywords for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy keywords_write on keywords for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

create policy keyword_checks_read on keyword_checks for select using (
  auth_member_role() in ('admin', 'manager') or is_assigned(project_id)
);
create policy keyword_checks_write on keyword_checks for all
  using (auth_member_role() in ('admin', 'manager') or is_assigned(project_id))
  with check (auth_member_role() in ('admin', 'manager') or is_assigned(project_id));

-- ---------------------------------------------------------------------
-- 5. RPC hardening
--    The real production database may already have upsert_* RPCs that
--    trust a caller-supplied p_by argument for attribution. None exist
--    in this reconstructed baseline, so there is nothing to harden yet
--    — but once this migration set is reconciled against the real
--    schema (see the baseline migration's header), apply this pattern
--    to every such function before RLS goes live, or a member role can
--    still write data attributed to someone else:
--
--      create or replace function upsert_checklist_status(...)
--      returns void language plpgsql security definer as $fn$
--      begin
--        if not (is_admin() or is_assigned(p_project_id)) then
--          raise exception 'not authorised';
--        end if;
--        -- ... existing body, using auth_member_id() rather than p_by
--      end;
--      $fn$;
--
--    Then drop p_by from the signature entirely — it is caller-supplied
--    and therefore untrustworthy.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 6. Audit log
-- ---------------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  table_name  text not null,
  row_id      text not null,
  action      text not null,               -- insert | update | delete
  actor_email text,
  changed     jsonb,
  at          timestamptz not null default now()
);
create index on audit_log (table_name, row_id, at desc);
create index on audit_log (at desc);

alter table audit_log enable row level security;
create policy audit_read on audit_log for select using (is_admin());

create or replace function log_change() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  rid text;
begin
  rid := coalesce(
    (to_jsonb(new) ->> 'id'),
    (to_jsonb(old) ->> 'id'),
    (to_jsonb(new) ->> 'project_id'),
    (to_jsonb(old) ->> 'project_id'),
    'unknown');

  insert into audit_log (table_name, row_id, action, actor_email, changed)
  values (
    tg_table_name,
    rid,
    lower(tg_op),
    auth.jwt() ->> 'email',
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_projects       after insert or update or delete on projects
  for each row execute function log_change();
create trigger audit_assignments    after insert or update or delete on assignments
  for each row execute function log_change();
create trigger audit_checklist_runs after insert or update or delete on checklist_runs
  for each row execute function log_change();
create trigger audit_offpage_runs   after insert or update or delete on offpage_runs
  for each row execute function log_change();
create trigger audit_team_members   after insert or update or delete on team_members
  for each row execute function log_change();

-- ---------------------------------------------------------------------
-- 7. Verification (run as an outsider, expect zero rows every time)
-- ---------------------------------------------------------------------
--   select * from projects;
--   select * from team_members;
--   select * from checklist_runs;
--   select * from keywords;
-- And as a member: only assigned projects come back.
