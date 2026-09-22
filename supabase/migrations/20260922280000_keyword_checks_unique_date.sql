-- Keywords section redesign: one rank per keyword per check date, shown
-- as a dated matrix (Sr.No / Keyword / Search vol. / one column per
-- check date) instead of a flat "latest rank" table, per the team's own
-- spreadsheet layout. Logging a rank for a date now upserts on
-- (keyword_id, checked_on) so re-logging the same day corrects that
-- day's cell instead of stacking duplicate rows — dedupe any existing
-- same-day duplicates first, keeping the most recently written one.
delete from keyword_checks kc
using (
  select id, row_number() over (
    partition by keyword_id, checked_on order by created_at desc, id desc
  ) as rn
  from keyword_checks
) ranked
where kc.id = ranked.id and ranked.rn > 1;

alter table keyword_checks
  add constraint keyword_checks_keyword_date_unique unique (keyword_id, checked_on);
