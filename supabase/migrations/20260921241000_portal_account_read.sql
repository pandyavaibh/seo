-- =====================================================================
-- Portal follow-up: the client portal needs to read the client's own
-- account row (name, website — shown in the portal header) but
-- accounts_read (Stage 1) is admin/manager only, so a client-role
-- member got zero rows. Adding the same account_id = self clause used
-- on every other portal-visible table in the Stage 7 migration.
-- =====================================================================

drop policy accounts_read on accounts;
create policy accounts_read on accounts for select using (
  auth_member_role() in ('admin', 'manager') or id = auth_member_account_id()
);
