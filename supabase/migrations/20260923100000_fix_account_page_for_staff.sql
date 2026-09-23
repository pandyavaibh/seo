-- The Account record page grew into the shared operational hub this
-- session (Keywords, Backlinks/Activities, Checklist, Log hours all
-- live there now) — every assigned staff member needs to reach it,
-- not just admin/manager. But useAccount() read the whole `accounts`
-- row in one `.single()` query under the original admin/manager-only
-- accounts_read policy (kept narrow on purpose — retainer/hours_budget/
-- notes shouldn't leak). For a `member`-role user that query returns
-- zero rows, `.single()` throws "Cannot coerce the result to a single
-- JSON object", and the WHOLE page crashes — including the
-- project-scoped sections they do have access to and need daily.
--
-- Fix: a single-row sibling to list_accounts_directory() for the
-- non-financial fields, callable by any is_staff(); the app falls
-- back to it when the full accounts row is blocked.
create or replace function get_account_directory(p_account_id uuid) returns table (
  id uuid, name text, website text, industry text, health account_health, renewal_on date
) language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.name, a.website, a.industry, a.health, a.renewal_on
  from accounts a
  where a.id = p_account_id and is_staff();
$$;

-- contacts (client-side stakeholders) and activities (call/meeting/
-- note log) aren't financial — they're exactly the "client context"
-- every assigned staff member needs, same reasoning
-- 20260922260000_merge_clients_engagements.sql already used for the
-- roster. Widen straight to is_staff(), same as projects_read already
-- effectively is for anyone assigned.
drop policy contacts_read on contacts;
create policy contacts_read on contacts for select using (is_staff());

drop policy activities_read on activities;
create policy activities_read on activities for select using (is_staff());
