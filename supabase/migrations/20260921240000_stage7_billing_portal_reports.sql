-- =====================================================================
-- Stage 7 — Reporting, client portal, and billing
--
-- Plan doc's Stage 7: report builder, client portal, billing,
-- profitability. Built with the same "no paid plan" discipline as
-- every other stage:
--
-- - No payment processor (Stripe etc.). "Invoice generation, payment
--   status" is built as a record-keeping table (retainer/project
--   invoices, line items, status draft/sent/paid/overdue) that staff
--   update by hand once a client pays some other way — not online
--   payment collection, which would mean a paid processor and PCI
--   scope this app has no reason to take on.
-- - Report "exportable to PDF" is built client-side (jsPDF, a free
--   npm package, see the report-builder page) — no server-side
--   rendering service. "Schedulable by email" ships as a manual
--   "send now" (see the send-report-email Edge Function, gated on a
--   free Resend API key the user sets up, same pattern as every other
--   external credential in this app) — true recurring auto-send on a
--   schedule is NOT built here; see docs/STAGE_7.md.
--
-- Client portal: member_role already has 'client' (Stage 0). What was
-- missing: (1) a client-role row couldn't even read its own
-- team_members row — team_read's policy was is_staff()-only, which
-- excludes 'client' by definition, so useCurrentMember() returned
-- nothing and the login flow dead-ended. Fixed below by adding a
-- self-read clause. (2) nothing tied a client-role member to *which*
-- account they belong to — team_members.account_id does that.
-- auth_member_account_id() is the client-side equivalent of
-- auth_member_id()/auth_member_role(): every portal-facing RLS policy
-- below reads through it instead of trusting anything client-supplied.
--
-- Every portal-visible table (reports, invoices, deliverables,
-- portal_comments) is scoped to account_id = auth_member_account_id()
-- for the client role, and reports additionally require status =
-- 'sent' — a draft report is a staff-only concept. Nothing here grants
-- a client access to hours, cost rates, or expenses: those stay
-- admin/manager (member_rates: admin only, per the plan doc's "Admin
-- sees everything including rates, margins and invoices" vs "Manager
-- ... not company-wide financials").
--
-- reports.snapshot is a frozen jsonb copy of the metrics pulled at
-- generation time (Stage 4/5/6 numbers, work completed, links built) —
-- deliberately NOT recomputed live on every view, so a report a client
-- was sent in March still shows March's numbers in June even as the
-- underlying tables keep changing.
-- =====================================================================

alter table team_members add column account_id uuid references accounts(id) on delete set null;

drop policy team_read on team_members;
create policy team_read on team_members for select using (
  is_staff() or email = lower(auth.jwt() ->> 'email')
);

create or replace function auth_member_account_id() returns uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select account_id from team_members
  where lower(email) = lower(auth.jwt() ->> 'email') and active;
$$;

create table member_rates (
  member_id      uuid primary key references team_members(id) on delete cascade,
  cost_rate_cents integer not null,
  updated_at     timestamptz not null default now()
);

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  text references projects(id) on delete set null,
  category    text not null check (category in ('link_cost', 'tool', 'other')),
  description text not null,
  amount_cents integer not null,
  incurred_on date not null default current_date,
  created_by  uuid references team_members(id),
  created_at  timestamptz not null default now()
);
create index on expenses (account_id, incurred_on);

create table invoices (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  kind         text not null default 'retainer' check (kind in ('retainer', 'project')),
  period_start date,
  period_end   date,
  amount_cents integer not null default 0,
  status       text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  issued_on    date,
  due_on       date,
  paid_on      date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index on invoices (account_id, status);

create table invoice_line_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id) on delete cascade,
  description  text not null,
  amount_cents integer not null
);
create index on invoice_line_items (invoice_id);

create table deliverables (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  text references projects(id) on delete set null,
  title       text not null,
  url         text,
  delivered_on date not null default current_date,
  created_by  uuid references team_members(id),
  created_at  timestamptz not null default now()
);
create index on deliverables (account_id);

create table reports (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  status         text not null default 'draft' check (status in ('draft', 'sent')),
  next_month_plan text,
  snapshot       jsonb not null default '{}'::jsonb,
  generated_by   uuid references team_members(id),
  generated_at   timestamptz not null default now(),
  sent_at        timestamptz
);
create index on reports (account_id, period_start);

create table portal_comments (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  body       text not null,
  author_id  uuid references team_members(id),
  created_at timestamptz not null default now()
);
create index on portal_comments (account_id, created_at);

alter table member_rates      enable row level security;
alter table expenses          enable row level security;
alter table invoices          enable row level security;
alter table invoice_line_items enable row level security;
alter table deliverables      enable row level security;
alter table reports           enable row level security;
alter table portal_comments   enable row level security;

-- Rates: admin-only, both read and write — this is the one place the
-- plan doc explicitly draws a line between admin and manager.
create policy member_rates_all on member_rates for all
  using (is_admin())
  with check (is_admin());

-- Expenses: internal financials, admin/manager only — never surfaced
-- to the client portal.
create policy expenses_all on expenses for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy invoices_read on invoices for select using (
  auth_member_role() in ('admin', 'manager') or account_id = auth_member_account_id()
);
create policy invoices_write on invoices for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy invoice_line_items_read on invoice_line_items for select using (
  exists (
    select 1 from invoices i where i.id = invoice_line_items.invoice_id
    and (auth_member_role() in ('admin', 'manager') or i.account_id = auth_member_account_id())
  )
);
create policy invoice_line_items_write on invoice_line_items for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy deliverables_read on deliverables for select using (
  is_staff() or account_id = auth_member_account_id()
);
create policy deliverables_write on deliverables for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- Reports: a client only ever sees a 'sent' report — a draft is a
-- staff-only working copy.
create policy reports_read on reports for select using (
  auth_member_role() in ('admin', 'manager')
  or (account_id = auth_member_account_id() and status = 'sent')
);
create policy reports_write on reports for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

-- Comment thread: staff and that account's client can both read and
-- post — this is the one table a client-role member can write to.
create policy portal_comments_read on portal_comments for select using (
  is_staff() or account_id = auth_member_account_id()
);
create policy portal_comments_write on portal_comments for insert with check (
  is_staff() or account_id = auth_member_account_id()
);
-- Moderation only — staff can remove a comment, nobody can edit one.
create policy portal_comments_delete on portal_comments for delete using (
  auth_member_role() in ('admin', 'manager')
);

create trigger audit_expenses after insert or update or delete on expenses
  for each row execute function log_change();
create trigger audit_invoices after insert or update or delete on invoices
  for each row execute function log_change();
create trigger audit_deliverables after insert or update or delete on deliverables
  for each row execute function log_change();
create trigger audit_reports after insert or update or delete on reports
  for each row execute function log_change();
