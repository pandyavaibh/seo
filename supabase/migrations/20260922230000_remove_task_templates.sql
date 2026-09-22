-- Remove the Task Templates feature (project_templates, template_tasks,
-- the applied_template_id/tasks_generated_through columns on projects,
-- and the daily cron job that regenerated tasks from an applied
-- template) by request. No project had a template applied
-- (applied_template_id was null everywhere), confirmed against the
-- live database before dropping anything.
select cron.unschedule('generate-recurring-tasks');
drop function if exists generate_recurring_tasks();
alter table projects drop column if exists applied_template_id;
alter table projects drop column if exists tasks_generated_through;
drop table if exists template_tasks;
drop table if exists project_templates;
