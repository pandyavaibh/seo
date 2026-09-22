-- Free technical site-audit check: scores + Core Web Vitals from
-- Google's no-cost PageSpeed Insights API, plus a direct robots.txt /
-- sitemap.xml presence check. One row per run, kept as history (not
-- upserted) so a client's audits over time are visible.
create table technical_audits (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references accounts(id) on delete cascade,
  url               text not null,
  run_at            timestamptz not null default now(),
  performance_score integer,
  seo_score         integer,
  accessibility_score integer,
  best_practices_score integer,
  lcp_ms            numeric,
  cls               numeric,
  inp_ms            numeric,
  has_robots_txt    boolean,
  has_sitemap       boolean,
  error             text,
  run_by            uuid references team_members(id) on delete set null
);
create index on technical_audits (account_id, run_at desc);

alter table technical_audits enable row level security;
create policy technical_audits_read  on technical_audits for select using (is_staff());
create policy technical_audits_write on technical_audits for all
  using (auth_member_role() in ('admin', 'manager'))
  with check (auth_member_role() in ('admin', 'manager'));
