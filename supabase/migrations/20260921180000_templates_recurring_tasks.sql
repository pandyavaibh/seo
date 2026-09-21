-- =====================================================================
-- Template library + recurring monthly task generation
--
-- Both gaps the Stage 2 migration's own header flagged and cut:
-- "No template library... needs a scheduled job — pg_cron or a
-- Supabase Edge Function on a cron trigger. That's real infrastructure
-- to design and test, not a table to bolt on." Building it now.
--
-- Recurring generation turns out not to need an Edge Function at all —
-- copying rows from template_tasks into tasks is pure SQL, no external
-- API involved (unlike Stage 4's GSC/GA4 sync, which genuinely needs
-- one). A plpgsql function + pg_cron is the whole thing.
--
-- projects.applied_template_id remembers which template a project is
-- following; tasks_generated_through ('YYYY-MM') stops the daily cron
-- tick from generating the same month's tasks twice. Only monthly-
-- billing projects (Stage 4's billing_cycle) with both set are ever
-- touched by the generator — one-time projects and projects nobody
-- applied a template to are left alone.
-- =====================================================================

create extension if not exists pg_cron;

create table project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table template_tasks (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references project_templates(id) on delete cascade,
  label          text not null,
  estimate_hours numeric(5,1),
  sort_order     integer not null default 0
);
create index on template_tasks (template_id, sort_order);

alter table projects add column applied_template_id uuid references project_templates(id);
alter table projects add column tasks_generated_through text; -- 'YYYY-MM'

alter table project_templates enable row level security;
alter table template_tasks    enable row level security;

create policy project_templates_read on project_templates for select using (is_staff());
create policy project_templates_write on project_templates for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy template_tasks_read on template_tasks for select using (is_staff());
create policy template_tasks_write on template_tasks for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create trigger audit_project_templates after insert or update or delete on project_templates
  for each row execute function log_change();
create trigger audit_template_tasks after insert or update or delete on template_tasks
  for each row execute function log_change();

-- Runs as whatever role pg_cron schedules it under (the migration
-- owner, effectively superuser) — bypasses RLS by nature, same as
-- every other server-side job in this app (the sync Edge Function's
-- service-role client works the same way).
create or replace function generate_recurring_tasks()
returns void
language plpgsql
as $$
declare
  this_month text := to_char(current_date, 'YYYY-MM');
  proj record;
begin
  for proj in
    select id, applied_template_id
    from projects
    where billing_cycle = 'monthly'
      and applied_template_id is not null
      and renewal_day = extract(day from current_date)
      and (tasks_generated_through is distinct from this_month)
  loop
    insert into tasks (project_id, label, estimate_hours, priority)
    select proj.id, tt.label, tt.estimate_hours, 'normal'
    from template_tasks tt
    where tt.template_id = proj.applied_template_id
    order by tt.sort_order;

    update projects set tasks_generated_through = this_month where id = proj.id;
  end loop;
end;
$$;

select cron.schedule(
  'generate-recurring-tasks',
  '0 6 * * *', -- daily at 06:00 UTC; the function itself only acts on projects whose renewal_day is today
  $$select generate_recurring_tasks()$$
);
