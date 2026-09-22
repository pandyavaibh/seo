-- Remove the Tasks feature (task list + "+1h" quick-log on the Project
-- workspace) by request — sitting empty and unused on every project.
-- Report generation (client-side use-reports.ts and both report-
-- sending Edge Functions) queried `tasks` for a "Work completed" line;
-- that line is gone from the report snapshot along with the table,
-- since there's nothing left to report there. time_entries stays —
-- it's still how hours are logged and read for "hours this month" —
-- only its optional task_id link goes away.
alter table time_entries drop column if exists task_id;
drop table if exists tasks;
drop type if exists task_status;
