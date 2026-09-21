-- =====================================================================
-- Project billing cycle — most engagements here are monthly SEO
-- retainers, not one-off projects, and nothing in the schema said so
-- until now. Adds the metadata (renews monthly vs one-time, and which
-- day of the month) to the Add engagement form and the workspace
-- header.
--
-- Deliberately NOT the recurring-task-generation engine
-- 20260921120000_stage2_tasks.sql's header already flagged as cut
-- ("auto-generated recurring monthly instances... needs a scheduled
-- job... add it when recurring generation is actually being built").
-- This is a label, not a job — the app's monthly numbers (hours this
-- month, checklist this month, links this month) already reset
-- automatically every month because those tables are keyed by month;
-- billing_cycle/renewal_day just make the human fact visible, they
-- don't drive any new automation.
-- =====================================================================

alter table projects add column billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly', 'one_time'));
alter table projects add column renewal_day smallint
  check (renewal_day between 1 and 31);
