-- Remove Capacity & strength and Leads by request.
--
-- Capacity & strength: dropped member_skills (skills matrix) and
-- member_leave (leave log), and team_members.weekly_capacity (only
-- ever read by this page's booked/capacity ratio). Kept:
-- assignments.weekly_hours/starts_on/ends_on (also added by Stage 3,
-- but used well beyond this page -- every "staff someone" flow on the
-- Project workspace and Assignments page) and member_rates (the "Cost
-- rates" admin panel that lived on this page moved to Settings, since
-- Billing's profitability calc still reads it).
drop table if exists member_skills;
drop table if exists member_leave;
alter table team_members drop column if exists weekly_capacity;

-- Leads: the public /lead capture form, its submit-lead Edge Function,
-- the leads staging table, and the staff /leads inbox all removed
-- together -- nobody had ever submitted the public form (0 rows).
drop table if exists leads;
