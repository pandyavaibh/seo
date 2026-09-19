-- Local/staging seed data only — never run against production.
-- Anonymised placeholder rows so `supabase db reset` gives a usable
-- local environment. Replace with a real (anonymised) export of the
-- production checklist template once the real schema is reconciled.

insert into checklist_template_items (label, category, sort_order) values
  ('Confirm GSC and GA4 access still valid', 'access', 1),
  ('Review crawl errors and fix top issues', 'technical', 2),
  ('Publish/update on-page content per plan', 'content', 3),
  ('Log off-page activity against monthly target', 'offpage', 4),
  ('Run keyword rank checks', 'keywords', 5),
  ('Send monthly client update', 'reporting', 6);

insert into team_members (email, name, role) values
  ('owner@example.com', 'Owner Admin', 'admin');

insert into projects (id, name, client_name, status) values
  ('demo-project', 'Demo Project', 'Demo Client', 'active');

insert into assignments (project_id, member_id)
  select 'demo-project', id from team_members where email = 'owner@example.com';
