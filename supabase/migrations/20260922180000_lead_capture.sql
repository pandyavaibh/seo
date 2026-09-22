-- Lead-capture web form. A staging table, not a direct write into
-- deals — deals RLS is (correctly) admin/manager-only, and letting an
-- unauthenticated visitor insert straight into the real pipeline means
-- any spam/bot submission pollutes it permanently. leads is the one
-- table in this schema with a public INSERT policy; everything else
-- about it (read/update/delete, and the real deals table) stays closed.
-- The with-check clause is deliberately narrow: a public submitter can
-- only ever create a 'new' row with no converted_deal_id — never touch
-- an existing row, never mark their own submission converted/spam.
create table leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone             text,
  company           text,
  message           text,
  source            text not null default 'Website form',
  status            text not null default 'new' check (status in ('new', 'converted', 'spam', 'archived')),
  converted_deal_id uuid references deals(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index on leads (status, created_at desc);

alter table leads enable row level security;

create policy leads_public_insert on leads for insert
  to anon, authenticated
  with check (status = 'new' and converted_deal_id is null);

create policy leads_staff_read on leads for select
  using (auth_member_role() in ('admin', 'manager'));

create policy leads_staff_write on leads for update
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy leads_staff_delete on leads for delete
  using (auth_member_role() in ('admin', 'manager'));
