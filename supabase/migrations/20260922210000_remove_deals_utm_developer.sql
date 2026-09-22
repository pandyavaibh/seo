-- Remove Deals, UTM builder, and Developer (API keys + webhooks) by
-- request — none had real data (deals: 0 rows; api_keys/webhook_
-- subscriptions/utm_links: unused), confirmed against the live
-- database before dropping anything.

-- Webhook infra (fire_webhooks + its three event triggers) only existed
-- to serve api_keys/webhook_subscriptions, which are going away, so the
-- whole mechanism goes with them.
drop trigger if exists webhook_deal_won on deals;
drop trigger if exists webhook_report_sent on reports;
drop trigger if exists webhook_invoice_paid on invoices;
drop function if exists trg_deal_won();
drop function if exists trg_report_sent();
drop function if exists trg_invoice_paid();
drop function if exists fire_webhooks(text, uuid, jsonb);
drop function if exists create_api_key(uuid, text);

-- leads.converted_deal_id pointed at deals — leads now just flip to
-- 'converted' status with no deal record created.
drop policy if exists leads_public_insert on leads;
alter table leads drop column if exists converted_deal_id;
create policy leads_public_insert on leads for insert
  to anon, authenticated
  with check (status = 'new');

drop table if exists deals;
drop table if exists api_keys;
drop table if exists webhook_subscriptions;
drop table if exists utm_links;
