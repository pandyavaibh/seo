-- The portal's Backlink Counter widget (20260922250000) read the old
-- per-link `backlinks` table specifically because offpage_activity_types/
-- entries were staff-only at the time. Now that backlinks is dropped and
-- the portal counter reads offpage_activity_entries (via activity_group
-- = 'backlinks') instead, it needs the same client-visibility widening
-- backlinks_read had, or it silently shows zero for every client.
alter policy offpage_activity_types_read on offpage_activity_types
  using (is_staff() or auth_member_role() = 'client');

alter policy offpage_entries_read on offpage_activity_entries
  using (
    auth_member_role() in ('admin', 'manager') or is_assigned(project_id) or is_own_account_project(project_id)
  );
