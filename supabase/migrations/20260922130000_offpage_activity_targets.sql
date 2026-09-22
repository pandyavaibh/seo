-- =====================================================================
-- Off-page activity targets — the real tool's Off-Page & Backlinks tab
-- breaks the project's monthly link_target (already existed —
-- baseline schema, default 200) down into 13 fixed activity types,
-- each with its own target and a "remaining" that's just
-- target_max - done, auto-computed, never stored. Transcribed exactly
-- from the user's live tool: most types have a single target (min =
-- max); Business Listing is shown as a real range (15-20).
--
-- offpage_runs already holds the "done" count per project/month/
-- activity_type (baseline schema) — this migration only adds the
-- target catalog to join against. Global, not per-project (same
-- "fixed catalog" pattern as checklist_template_items) — every
-- project's Off-Page tab shows the same 13 rows against its own
-- monthly counts.
-- =====================================================================

create table offpage_activity_types (
  activity_type text primary key,
  target_min    integer not null,
  target_max    integer not null,
  sort_order    integer not null default 0
);

insert into offpage_activity_types (activity_type, target_min, target_max, sort_order) values
('Guest Post', 20, 20, 10),
('Web2.0', 10, 10, 20),
('Document', 20, 20, 30),
('Business Listing', 15, 20, 40),
('Business Profile', 10, 10, 50),
('Social Bookmarking', 30, 30, 60),
('Social Content Sharing', 30, 30, 70),
('Classified', 20, 20, 80),
('Article', 5, 5, 90),
('Contextual', 10, 10, 100),
('Image', 10, 10, 110),
('PR', 5, 5, 120),
('Link Tree', 5, 5, 130);

alter table offpage_activity_types enable row level security;

create policy offpage_activity_types_read on offpage_activity_types for select using (is_staff());
create policy offpage_activity_types_write on offpage_activity_types for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));
