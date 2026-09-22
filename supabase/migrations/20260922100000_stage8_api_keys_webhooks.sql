-- =====================================================================
-- Stage 8 — Intelligence (part 1: public API + webhooks)
--
-- Plan doc's Stage 8 is explicitly "ongoing," not a fixed sprint, and
-- lists five things: traffic forecasting, anomaly detection, AI-written
-- report commentary, churn-risk scoring, and a public API with
-- webhooks. Forecasting/anomalies/churn-risk are pure computation over
-- data this app already has (metric_snapshots, invoices, backlinks,
-- portal_comments) — built client-side in hooks, no new tables. Report
-- commentary is rule-based (templated sentences from the same period-
-- over-period deltas already computed for the report snapshot), not an
-- LLM call — scoped that way per the user's explicit decision, since a
-- real LLM API is a paid, usage-billed service unlike everything else
-- in this app.
--
-- This migration is the one piece of Stage 8 that needs new tables:
-- the public API (api_keys) and webhooks (webhook_subscriptions).
-- Both are free — a public API is just this app's own Postgres data
-- exposed through a new Edge Function, and webhooks are outbound HTTP
-- calls via pg_net (already used for the nightly syncs), not a paid
-- webhook-delivery service.
--
-- api_keys stores only a SHA-256 hash of each key, never the raw
-- value — the raw key is generated and returned exactly once, by
-- create_api_key() below, the same "shown once, never stored"
-- convention as GitHub/Stripe tokens. A key is either account-scoped
-- (account_id set — reads just that client's summary) or org-wide
-- (account_id null, admin-managed) — checked by the public-api Edge
-- Function itself, since a public API request carries no Supabase
-- session to run through RLS at all.
--
-- webhook_subscriptions + fire_webhooks() + the three trigger
-- functions below are how "report sent," "invoice paid," and "deal
-- won" become outbound events. A fixed, small set of event types
-- rather than a generic event bus — extending it later means adding
-- another trigger the same shape as these three, not a schema change.
-- =====================================================================

create table api_keys (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  label      text not null,
  key_hash   text not null unique,
  key_prefix text not null,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on api_keys (key_hash);

create table webhook_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  url        text not null,
  event_type text not null check (event_type in ('report.sent', 'invoice.paid', 'deal.won')),
  secret     text not null,
  active     boolean not null default true,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now()
);
create index on webhook_subscriptions (event_type, active);

alter table api_keys             enable row level security;
alter table webhook_subscriptions enable row level security;

create policy api_keys_all on api_keys for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create policy webhook_subscriptions_all on webhook_subscriptions for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create trigger audit_api_keys after insert or update or delete on api_keys
  for each row execute function log_change();
create trigger audit_webhook_subscriptions after insert or update or delete on webhook_subscriptions
  for each row execute function log_change();

-- Generates a raw key, stores only its hash, returns the raw key once.
-- Callable via RPC from the app; role-checked inside the function
-- itself (not RLS — RLS on api_keys governs reading/revoking rows,
-- this INSERT path needs the raw value handed back before it's hashed
-- away).
create or replace function create_api_key(p_account_id uuid, p_label text) returns text
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_raw  text;
  v_hash text;
begin
  if auth_member_role() not in ('admin', 'manager') then
    raise exception 'admin or manager role required';
  end if;
  v_raw := 'sk_live_' || encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_raw, 'sha256'), 'hex');
  insert into api_keys (account_id, label, key_hash, key_prefix, created_by)
  values (p_account_id, p_label, v_hash, left(v_raw, 16), auth_member_id());
  return v_raw;
end;
$$;

create or replace function fire_webhooks(p_event text, p_account_id uuid, p_payload jsonb) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sub record;
begin
  for sub in
    select * from webhook_subscriptions
    where event_type = p_event and active
      and (account_id is null or account_id = p_account_id)
  loop
    perform net.http_post(
      url := sub.url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', sub.secret),
      body := p_payload
    );
  end loop;
end;
$$;

create or replace function trg_report_sent() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    perform fire_webhooks(
      'report.sent',
      new.account_id,
      jsonb_build_object('reportId', new.id, 'accountId', new.account_id, 'periodStart', new.period_start, 'periodEnd', new.period_end)
    );
  end if;
  return new;
end;
$$;
create trigger webhook_report_sent after update on reports
  for each row execute function trg_report_sent();

create or replace function trg_invoice_paid() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    perform fire_webhooks(
      'invoice.paid',
      new.account_id,
      jsonb_build_object('invoiceId', new.id, 'accountId', new.account_id, 'amountCents', new.amount_cents)
    );
  end if;
  return new;
end;
$$;
create trigger webhook_invoice_paid after update on invoices
  for each row execute function trg_invoice_paid();

create or replace function trg_deal_won() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.stage = 'won' and old.stage is distinct from 'won' then
    perform fire_webhooks(
      'deal.won',
      new.account_id,
      jsonb_build_object('dealId', new.id, 'accountId', new.account_id, 'name', new.name, 'valueCents', new.value_cents)
    );
  end if;
  return new;
end;
$$;
create trigger webhook_deal_won after update on deals
  for each row execute function trg_deal_won();
