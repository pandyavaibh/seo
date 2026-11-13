# Stage 10 — In-house team work & management

Prompted by: "improve SEO CRM that best in Industries for in house team
work and management." Scoped down to three areas by direct request:
workload & capacity, task management, and performance/productivity
reporting — not a specific competitor's UI (asked, and told to use
judgment).

Deliberately **not** a revival of two earlier, removed features:
Capacity & strength (the skills matrix + `member_leave`, cut in
`20260922240000_remove_capacity_and_leads.sql`) and Leave & Attendance
(built, then removed in `20261112100000_remove_leave_and_attendance.sql`
for sitting unused). Both were cut because nobody used them in their
original shape. This stage reuses one real idea from the first
(per-person weekly capacity) inside a new, more useful view, but
doesn't bring back a skills matrix or a leave log nobody asked for.

## What's built

### Workload & capacity (`/workload`, admin/manager)

Per active team member: hours assigned (sum of `assignments.weekly_hours`
across their *active* engagements — paused/non-active projects don't
count toward load), hours actually logged this week (`time_entries`),
and a weekly capacity figure an admin sets directly on the page
(`team_members.weekly_capacity_hours`, a new column — the same role the
old, dropped `weekly_capacity` column played, reintroduced because this
page gives it a real job). Utilization is assigned ÷ capacity as a
percent, shown as a colored progress bar (green ≤90%, amber ≤110%, red
above) and explicitly reads "capacity not set" rather than silently
treating a blank capacity as zero. A summary line below the list calls
out anyone over 110% or with no capacity set yet, so a manager doesn't
have to scan the whole table to find who needs attention.

### Task management (`/tasks`, new `tasks` table)

A real, lightweight to-do system — not the old per-project "+1h quick
log" Tasks table (removed in Stage 9, along with `time_entries.task_id`)
and not a recurring-task engine. A task has a title, optional notes,
priority (high/medium/low), status (to do → in progress → done, cycled
by clicking its checkbox), an optional due date, an optional assignee,
and an optional client link. **My tasks** (everyone) shows what's
assigned to the signed-in member; **Team tasks** (admin/manager) shows
everyone's, filterable by assignee. A task optionally linking to a
client (`account_id`) shows that client's name as a link back to its
page — useful for "call so-and-so about renewal" style work that isn't
really checklist or activity-log material. The Dashboard's "My work
today" card now also shows up to 4 open tasks, linking to the full
list.

RLS: read is any staff member (`is_staff()`, same as `team_members`/
`assignments` already allow — a manager building Team Tasks needs to
see everyone's); write is narrower — your own assigned tasks, tasks you
created, or admin/manager.

### Performance & productivity reporting (`/performance`, admin/manager)

Per person, this calendar month: hours logged, tasks completed, tasks
currently overdue, and checklist items they personally closed out
(`checklist_runs.done_by`, grouped by month — a real "who's actually
finishing checklist work" metric, not invented). A bar chart above the
table shows total team hours logged per week for the last 8 weeks,
built from `time_entries` grouped by week — a genuine trend, not a
fabricated sparkline.

## What wasn't built, on purpose

- **No skills matrix or leave log** — see above; nobody asked for them
  back, and they sat unused the first time.
- **No per-task subtasks, templates, or recurrence** — the Stage 2
  "Tasks" rebuild earlier in this project went that direction and got
  cut entirely for being over-built and empty. This version is
  deliberately plain.
- **No productivity "score" or ranking between people** — hours/tasks/
  checklist counts are shown as-is, not combined into a single number
  that would imply comparing people is the point. A manager can read
  the numbers; the page doesn't editorialize them.

(`supabase/migrations/20261112200000_stage10_team_management.sql`)
