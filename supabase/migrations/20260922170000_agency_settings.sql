-- White-label branding: a single row of agency-wide settings applied to
-- the client portal shell, the PDF report header, and the public lead-
-- capture form (see 20260922180000_lead_capture.sql) — replacing the
-- hardcoded "SEO CRM" branding those show today. Read is public,
-- including to anon, since a name/logo/color is not sensitive and the
-- lead form is itself unauthenticated; write is admin only, matching
-- every other agency-wide config table.
create table agency_settings (
  id            uuid primary key default gen_random_uuid(),
  agency_name   text not null default 'SEO CRM',
  logo_url      text,
  primary_color text not null default '#1f5c46',
  updated_at    timestamptz not null default now()
);

alter table agency_settings enable row level security;
create policy agency_settings_read  on agency_settings for select using (true);
create policy agency_settings_write on agency_settings for all
  using (is_admin())
  with check (is_admin());

insert into agency_settings (agency_name) values ('SEO CRM');
