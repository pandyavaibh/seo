-- Security advisor flagged generate_recurring_tasks() with a mutable
-- search_path (the same class of issue as every other function in this
-- schema already sets, just missed when the function was first written).
alter function generate_recurring_tasks() set search_path = public, pg_temp;
