-- Clients and Engagements merge into one page/nav item. The old
-- Clients page (accounts_read) was admin/manager-only; the old
-- Engagements page (projects_read) was open to any staff member for
-- their own assigned work. Per the user's explicit call ("merge with
-- all the information, because we are not sharing client budget or
-- payment related terms"): the merged roster is opened to every staff
-- member, but only non-financial columns — retainer_cents,
-- hours_budget, notes, account_manager_id stay behind the existing
-- accounts_read policy (admin/manager only), unchanged, still gating
-- the Account record page's edit form and the Billing page.
--
-- list_accounts_directory() is a SECURITY DEFINER function rather than
-- a wider accounts_read policy specifically so it can expose a
-- narrower column set than the full row — RLS alone is row-level, not
-- column-level, so a broader policy on `accounts` would have leaked
-- retainer/budget too.
create or replace function list_accounts_directory()
returns table (
  id uuid,
  name text,
  website text,
  industry text,
  health account_health,
  renewal_on date
)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.name, a.website, a.industry, a.health, a.renewal_on
  from accounts a
  where is_staff()
  order by a.name;
$$;
