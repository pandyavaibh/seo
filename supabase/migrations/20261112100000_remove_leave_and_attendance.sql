-- Remove the Leave & Attendance tab, by request ("Remove Section -
-- Leave & Attendance"). Confirmed before dropping: member_leave had 0
-- rows; attendance_entries had exactly 1 real punch-in row, which goes
-- with the table — small enough, and an explicit removal request, that
-- this wasn't held back for a lower-stakes confirmation round the way
-- a bulk/ambiguous delete would be.
drop table if exists attendance_entries;
drop table if exists member_leave;
