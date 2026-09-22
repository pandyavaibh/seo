-- Collapse the Client/Engagement split further, by request: "remove
-- Engagements" from the Client page, replaced with Backlinks, Keywords,
-- and On-page + Technical Activities living directly on the Client
-- record, all logged through one dated Activity control (today only,
-- no back/forward-dating) plus Log Hours and a combined activity list.
--
-- Off-Page already had exactly this shape for backlink-building work —
-- a dropdown of activity types, each with a monthly target and a
-- running "done/left" count from dated entries. Generalising it with a
-- group column lets On-Page and Technical Foundation log the same way,
-- replacing their old per-month checkbox status (checklist_runs) with
-- a dated, attributable entry — every other checklist category is
-- untouched.
alter table offpage_activity_types
  add column activity_group text not null default 'backlinks'
  check (activity_group in ('backlinks', 'on_page', 'technical'));

-- One activity type per checklist item in these two categories, target
-- of 1 (done or not, same as the checkbox it replaces) — sort_order
-- offset well clear of the 13 existing backlink types (10-130).
insert into offpage_activity_types (activity_type, target_min, target_max, sort_order, activity_group)
select
  label,
  1,
  1,
  (case category when 'On-Page & Structured Data' then 1000 else 2000 end) + sort_order,
  (case category when 'On-Page & Structured Data' then 'on_page' else 'technical' end)
from checklist_template_items
where category in ('On-Page & Structured Data', 'Technical Foundation') and active;

update checklist_template_items
set active = false
where category in ('On-Page & Structured Data', 'Technical Foundation');
