-- Scheduled/recurring report emails — turns Stage 7's manual "generate
-- + send" into an automatic monthly send. One schedule per account
-- config (recipient + day of month); a daily pg_cron job (reusing the
-- same internal_config cron secret Stage 4's nightly sync introduced)
-- checks which schedules are due and, for each, builds the report
-- snapshot itself (same computation buildSnapshot()/generateCommentary()
-- already do client-side for a manual "Generate report" — ported into
-- the Edge Function so this can run unattended) and sends it via
-- Resend. Still blocked on the same RESEND_API_KEY Stage 7 already
-- flagged as open — this fails harmlessly and identically to the
-- manual send path until that secret exists.
create table report_schedules (
  id                   uuid primary key default gen_random_uuid(),
  account_id           uuid not null references accounts(id) on delete cascade unique,
  recipient_email      text not null,
  send_day             integer not null check (send_day between 1 and 28),
  active               boolean not null default true,
  last_sent_period_end date,
  created_at           timestamptz not null default now()
);

alter table report_schedules enable row level security;
create policy report_schedules_read on report_schedules for select using (
  auth_member_role() in ('admin', 'manager')
);
create policy report_schedules_write on report_schedules for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));

create trigger audit_report_schedules after insert or update or delete on report_schedules
  for each row execute function log_change();

select cron.schedule(
  'daily-scheduled-reports',
  '0 6 * * *', -- 06:00 UTC — after the 03:00 nightly search/meta sync lands
  $$
  select net.http_post(
    url := 'https://bmlvurfoksjlckrubehn.supabase.co/functions/v1/send-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from internal_config where key = 'cron_sync_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
