# Stage 9 — Market feature parity (free-tier only)

Prompted by: "help me create the best SEO CRM based on what's currently in
the market, I need all the information they currently give." Scoped down
to what's actually buildable before writing any code — see the cost-wall
note below, which is the real constraint on this stage's size.

## The cost wall (read this before adding anything else here)

Semrush, Ahrefs and Moz Pro's core value — keyword search volume at
scale, keyword difficulty, Domain Authority / backlink index, automated
competitor gap analysis — comes from **proprietary crawled data behind
paid APIs**. There's no free way to replicate that; it's licensed data,
not a feature to implement. This is the same reasoning that already
made `keywords.search_volume` a manual-entry field back in the
checklist/off-page rebuild — this project runs at $0/month, and that
rule doesn't bend for this stage either. Anything added to Stage 9 has
to be backed by either data already in this CRM, or a genuinely free
API/check (Google's own free tools qualify; a paid competitor's API key
does not).

## What's built

- **Deals Kanban board** (`/deals`, default view) — the six `deal_stage`
  columns, drag-and-drop between them (plain HTML5 drag events, no new
  dependency) calling the same `useUpdateDealStage` mutation the table
  view already used. A Table/Board toggle keeps the original flat-table
  view available. Modeled on the pipeline board every sales CRM in the
  "HubSpot/Pipedrive/monday.com" category leads with.
- **Free technical site-audit check** — new `technical_audits` table +
  `run-technical-audit` Edge Function, surfaced as a card on the Account
  record. One click runs:
  - Google's **PageSpeed Insights API** (free, no key required for
    occasional manual runs — an optional `PAGESPEED_API_KEY` secret
    raises the unauthenticated rate limit if this gets used more) for
    Performance / SEO / Accessibility / Best Practices scores plus lab
    Core Web Vitals (LCP, CLS, INP where Lighthouse reports it).
  - A direct `robots.txt` / `sitemap.xml` presence check.
  Every run is kept as history (not upserted), same "audit trail over
  current-state-only" choice as the checklist/off-page tables. This is
  the closest free equivalent to what Semrush Site Audit / Ahrefs Site
  Audit charge for — real Lighthouse data, not a fabricated score.
- **Team & Projects quick-add panel** on `/assignments` (admin only,
  matching `team_write`'s RLS) — add a staff member by name/Gmail/role
  or a bare project by name, with remove buttons on each. This is the
  one piece of the real production tracker's admin surface (see Stage 1
  below) that the initial `/assignments` build deliberately left out;
  it's additive alongside the richer account-linked "New engagement"
  flow, not a replacement for it.
- **White-label branding** — a single `agency_settings` row (agency
  name, logo URL, primary color; admin-only write, publicly readable
  since none of it is sensitive), applied to the client portal shell
  (`--color-brand` overridden per the CSS custom property cascade, not
  a full runtime theming system — a deliberately light touch), the PDF
  report header, and the new public lead form below. Admin-only
  `/settings` page to edit it.
- **Lead-capture web form** — a public, unauthenticated `/lead` page
  (outside every auth guard, like `/sign-in`) posting to a new
  `submit-lead` Edge Function. Submissions land in a new `leads`
  staging table, not straight into `deals` — `deals` RLS stays
  admin/manager-only exactly as Stage 1 set it, and a staging table
  means a spam submission never pollutes the real pipeline. `leads` has
  exactly one public capability: `anon`/`authenticated` can INSERT a
  `status = 'new'` row with no `converted_deal_id`; every other
  operation (read, update, delete) stays admin/manager, same as
  `deals`. The Edge Function adds one free, honeypot-based spam filter
  on top (a hidden field real visitors never fill); there's no real
  rate limiting since that needs a paid store or Cloudflare's paid
  rate-limiting tier — staff triage on the new `/leads` inbox (admin/
  manager: convert to a deal, mark spam, or archive) is the practical
  backstop instead, the same tradeoff every small business contact form
  makes.

- **Scheduled/recurring report emails** — a new `report_schedules` table
  (one row per account: recipient email, day of month, active/paused,
  `last_sent_period_end` so a schedule never double-sends the same
  month) plus a `send-scheduled-reports` Edge Function, cron-triggered
  daily at 06:00 UTC (reusing the same `internal_config.cron_sync_secret`
  Stage 4's nightly sync introduced — one internal call-auth token for
  every cron-driven function, not a new credential). Unlike the manual
  "Generate report" flow, this runs fully unattended: the report
  snapshot computation (`buildSnapshot`/`generateCommentary`, the same
  pure logic `use-reports.ts` already used client-side) is ported into
  the Edge Function itself, so no staff action is needed before the
  send — the `next_month_plan` field, the one genuinely manual part of
  a report, is simply left blank on an auto-generated one. A
  "Recurring send" card on the Reports page lets an admin/manager set
  or pause a schedule per account. Still blocked on the same
  `RESEND_API_KEY` Stage 7 already flagged as open (your action, not
  code) — until it exists, the function still generates and stores the
  report each month, just doesn't send it, and says so per-account in
  its response rather than failing silently.

## Keywords section — now a dated matrix

The Rankings table on the Project workspace used to show one row per
keyword with only its latest rank. Rebuilt to match the team's own
tracking spreadsheet: Sr.No / Keyword / Search vol. / Target, then one
column per check date (most recent first), each cell showing that
date's rank — the same pivot shape as the imported Aspire Square
workbook, now backed by the `keyword_checks` history already collected
per keyword instead of a flat "latest only" view.

Logging is now a dated batch, not a one-row-at-a-time action: "Log
ranks for a date" opens a date field (defaults to today, editable to
log or correct any past date) and an editable draft column pre-filled
with that date's existing values if any; staff fill in ranks for as
many keywords as they checked in that sitting and save them all in one
`useLogRanksForDate` upsert, matching "add a (date) column when we
check ranking" rather than logging keyword-by-keyword. Re-logging an
already-used date corrects that column instead of adding a duplicate —
`keyword_checks` now has a `unique (keyword_id, checked_on)` constraint
plus an upsert on that pair, after deduping the small number of
same-day duplicate entries that existed before the constraint went on
(`supabase/migrations/20260922280000_keyword_checks_unique_date.sql`).

## Off-page activity logging — now date-wise

The per-type "Done" count on `/projects/:id/offpage` used to be a single
editable number per project/month/activity_type (`offpage_runs`), reset
by overtyping it. Replaced with dated entries
(`offpage_activity_entries`: project, activity type, date, count, note)
per the user's own worked example — log a batch as it happens (e.g.
Guest Post: Sep 2 → +4 → 16 left; Sep 7 → +6 → 10 left; Sep 14 → +6 → 4
left, against a target of 20) instead of hand-tracking a running total
and overwriting one number. "Done" and "Remaining" for the month are
computed by summing that month's entries against the type's target, same
scope `offpage_runs` had (a fresh count each month); a collapsible
history under each activity type (mirroring the audit card's "Past
runs") shows every dated entry with the running total after it, and
each entry can be deleted. Existing `offpage_runs` rows were migrated
into one backfill entry each before the old table was dropped
(`supabase/migrations/20260922220000_offpage_activity_entries.sql`);
the account-level and project-workspace "links this month" rollups
(`use-account-performance.ts`, `use-project-workspace.ts`) now sum from
the same entries table over the same month's date range instead.

## Clients and Engagements merged

Two separate top-level sections — Clients (`/clients`, accounts only,
admin/manager-only RLS) and Engagements (`/projects`, all projects,
visible to any staff member for their own assigned work) — merged into
one, by request: "merge with all the information, because we are not
sharing client budget or payment related terms." Now:

- **One nav item, "Clients."** The `/projects` list route, its page,
  and the "Engagements" sidebar link are gone.
- **Each client is a card** with its account info (name, website,
  health, renewal) and, if it has an engagement, its name and staffed
  team inline — nothing hidden behind a click that wasn't already one
  click away before. Engagements with no `account_id` (bare/ops
  projects) list in an "Unlinked engagements" section at the bottom.
  (The nested engagement *table* and the separate `/projects/:id`
  workspace it linked to were later replaced outright — see "Engagement
  workspace folded into the Client page" below.)
- **Opened to every staff member**, not just admin/manager — the
  explicit reasoning above. `list_accounts_directory()` is a new
  `SECURITY DEFINER` function returning only `id, name, website,
  industry, health, renewal_on` (no `retainer_cents`, `hours_budget`,
  `notes`, or `account_manager_id`) to any `is_staff()` caller. It's a
  function rather than a wider `accounts_read` policy specifically
  because RLS is row-level, not column-level — a broader policy on the
  table itself would have leaked retainer/budget along with it. The
  Account record page (`/clients/:id`, full row, edit form) and
  Billing still read straight from `accounts` under the original
  admin/manager-only policy, unchanged — this only widens the roster.
  A member still only sees the engagements they're assigned to under
  each client (`projects_read`'s existing scope, untouched), so this
  purely adds client context they didn't have before, nothing new
  about who's staffed where.
- "Add client" only shows for admin/manager (client-side, matching the
  unchanged server-side write policy).

(`supabase/migrations/20260922260000_merge_clients_engagements.sql`)

## Engagement workspace folded into the Client page

Every client has exactly one engagement in practice, so the separate
`/projects/:id` workspace (and its `checklist`/`offpage` sub-pages) was
retired by request — "remove Engagements, add Backlinks/Keywords/
On-page + Technical Activities [...] as sections" directly on the
Client page. `/clients/:id` is now the one stop for a client: header
stats and performance tiles, then (reading the account's first project)
Assigned team, Log hours, Keywords, Activities (Backlinks/On-Page/
Technical), the Sitewide checklist, an SEO activity log, and Traffic/
Custom KPI cards — everything that used to require a second click into
a separate workspace page. A client with no engagement yet gets a
"Set up engagement" prompt instead of empty sections.

- **Backlinks, On-Page and Technical are now one generalized "activity
  group" system**, not three different things. Off-Page's existing
  dated/targeted log (`offpage_activity_types` + `offpage_activity_entries`
  — pick a type, log a dated count, see done/target/left) gained an
  `activity_group` column (`backlinks` | `on_page` | `technical`). The
  7 "On-Page & Structured Data" and 21 "Technical Foundation" checklist
  items became new activity types in their own groups (target 1 — done
  or not, same as the checkbox they replace, but now dated and
  attributable) and were deactivated in `checklist_template_items` — the
  other 7 checklist categories (53 items) are untouched and still a
  plain monthly checklist. Each group gets one compact "log an activity"
  control — pick the type from a dropdown, count, optional note — with
  the date **fixed to today** (no input for it at all, so a past or
  future date literally isn't choosable), per "no one can add past or
  feature dates." Per-type done/target/left stays visible beneath it,
  same as Off-Page always showed ("Show Left in the target").
  (`supabase/migrations/20260922290000_client_activities.sql`)
- **Keywords** is the same dated matrix from the last change, just
  moved from the workspace page onto the Client page directly
  (`keywords-section.tsx`) — logging and the date-column behavior are
  unchanged.
- **Log hours** was never actually lost when Tasks was removed — it's
  a separate, already-complete feature (`project-hours-panel.tsx`,
  `time_entries`) that just lived collapsed behind a "Log hours ▾"
  toggle per engagement row. It's now always visible on the Client page
  with the per-member monthly breakdown in its header, "so we can
  easily check how many hours are spent on each project."
- **A new "SEO activity log"** (`use-activity-feed.ts`) is a combined,
  date-sorted feed of everything logged through the activity groups
  plus hours — "List of Activities." Keyword checks are deliberately
  left out of it (the Keywords matrix is already that history, and
  2,000+ rank checks would drown out everything else).
- **The old per-link `backlinks` table** (domain/status pipeline/cost,
  the "Add prospect" flow) is gone — 0 rows, and superseded by the new
  Backlinks activity group. Its cost tracking (`backlinks.cost_cents`)
  had no real replacement field in the new model, so Billing's "Link
  costs" figure now reads the `expenses` table's existing `link_cost`
  category instead (a parallel path that already existed) rather than
  double-counting. Reports' "Links built" figure changed from a
  per-domain list to a plain count (sum of dated Backlinks-group
  entries in the period) for the same reason — there's no per-domain
  record left to list.
  (`supabase/migrations/20260922300000_remove_old_backlinks_table.sql`)
- **Portal visibility carried over.** The portal's Backlink Counter
  widget (Stage 9, `use-portal-performance.ts`) read `backlinks`
  specifically because `offpage_activity_types`/`entries` were
  staff-only at the time. Now that it reads those tables instead, they
  needed the same client-visibility widening `backlinks_read` had, or
  every client's counter would have silently shown zero.
  (`supabase/migrations/20260922310000_portal_backlinks_activity_read.sql`)
- **Route cleanup.** `/projects/:projectId`, `/projects/:projectId/checklist`
  and `/projects/:projectId/offpage` are gone, along with
  `project-workspace-page.tsx`, `checklist-page.tsx`, `offpage-page.tsx`
  and `project-sub-nav.tsx`. `use-project-workspace.ts` now only holds
  the assignment mutations (still used from the Client page); the rest
  of its old query was superseded by `useAccount`'s widened project
  select (team, link target, traffic goals, etc.).

If a client ever needs more than one real engagement, this model doesn't
support it yet — only the first project per account is shown. That
matches how every client is actually set up today, and wasn't something
this change was asked to solve.

## Removed by request

Several features were removed at the user's request while browsing the
live app, each confirmed to have no real data before dropping anything:

- **Deals Kanban board** (above) and **UTM builder** (Stage 6) —
  `deals`: 0 rows; `utm_links`: unused. Leads → Convert previously
  created a `deals` row; it now just flips the lead's status to
  `converted` with no deal record, since there's no pipeline to
  convert into anymore.
- **Developer page** — API keys + webhooks (Stage 8) — `api_keys`/
  `webhook_subscriptions`: unused. Took the `fire_webhooks()`/
  `create_api_key()` functions and the three webhook-firing triggers
  (`report.sent`, `invoice.paid`, `deal.won`) with it, since those
  existed only to serve those tables. The `public-api` Edge Function's
  source was deleted too (it read `api_keys`, so it's dead without that
  table) — **the deployed function itself is still live on Supabase**,
  same limitation as `sync-meta-performance` in Stage 6: this session's
  tools can't delete a deployed Edge Function, only its source, so
  delete it manually from the dashboard if you want it fully gone.
- **Task Templates** (Stage 2's `project_templates`/`template_tasks`) —
  0 rows, no project had `applied_template_id` set. Took its daily
  `generate-recurring-tasks` cron job, the `generate_recurring_tasks()`
  function, and the "Apply template" control on the Project workspace
  page with it.
- **Capacity & strength** (`/capacity`) — the skills matrix
  (`member_skills`), leave log (`member_leave`), and
  `team_members.weekly_capacity` are gone. The "Cost rates" admin
  panel that lived at the bottom of that page moved to **Settings**
  (`/settings`, admin-only) rather than being deleted with it — Stage
  7's Billing profitability calculation still reads `member_rates`, so
  the only way to ever set a rate couldn't go with the page.
  `assignments.weekly_hours`/`starts_on`/`ends_on` (added by the same
  Stage 3 migration as the dropped columns) stayed, since Project
  workspace and Assignments staffing both depend on them well beyond
  this one page.
- **Leads** (`/leads`, the public `/lead` form, `submit-lead` Edge
  Function, and the `leads` table) — nobody had ever submitted the
  public form. Same "deployed function outlives its deleted source"
  limitation as above applies to `submit-lead`.

- **Tasks** (the task list + "+1h" quick-log card on the Project
  workspace page) — sitting empty and unused on every project. Took
  the `tasks` table, `task_status` enum, and `time_entries.task_id`
  (its optional link column — `time_entries` itself stays, since hours
  are still logged and read from it for "hours this month" independent
  of any task). The workspace's "Assigned team" and "This month" cards
  move into the two side-by-side slots the removed card's column used
  to occupy. Report generation had a "Work completed" line built from
  `tasks`, client-side (`use-reports.ts`) and in both report-sending
  Edge Functions (`send-report-email`, `send-scheduled-reports`,
  redeployed) — gone along with the table, since there's nothing left
  to report there.

If any of these are ever wanted back, they need to be rebuilt from
scratch — the tables and Edge Function source are gone, not just
hidden.

(`supabase/migrations/20260922210000_remove_deals_utm_developer.sql`,
`supabase/migrations/20260922230000_remove_task_templates.sql`,
`supabase/migrations/20260922240000_remove_capacity_and_leads.sql`,
`supabase/migrations/20260922270000_remove_tasks.sql`)

## Leave & Attendance (new tab)

A new "Leave & Attendance" nav item, visible to every staff member —
"Each Team Add their Punch in And punch out":

- **Attendance** (`attendance_entries`: member, work date, punch in,
  punch out, note; unique per member/day) — a "Punch In" button starts
  today's entry, "Punch Out" fills it in; a "Team today" card shows
  everyone's times and hours worked live, and each member sees their
  own last 14 days. One session per day, not multiple in/out pairs
  (no lunch-break split) — matches the literal ask; that's a follow-up
  if it's ever needed.
- **Leave** (`member_leave`: member, date range, kind — leave/holiday/
  sick, note) — this is the exact table Stage 3's Capacity & strength
  page used before that whole page was removed by request; the leave
  log itself was never the problem, so it's rebuilt verbatim as its
  own tab rather than redesigned. Any staff member logs their own;
  admins/managers can log or remove anyone's, matching the original
  policy. Split into "Upcoming & current" and a collapsed "Past".

Same self-or-admin/manager write, staff-read-all RLS pattern as the
rest of the app's per-person data (time entries, the old leave table).

(`supabase/migrations/20260922320000_leave_and_attendance.sql`)

## Deliberate scope cuts

- **No keyword research, keyword difficulty, or backlink index** — the
  cost-wall reason above. `keywords.search_volume` stays manual entry.
- **No automated competitor gap analysis** — same reason; a real
  competitor crawl needs the same paid data Semrush/Ahrefs sell.
- **No email sequencing** (the "HubSpot" comparison's other big gap) —
  deliberately not started this pass; Resend/Postmark both have real
  free tiers so it's buildable, but it's a separate scoped decision
  (sender domain/DNS setup, deliverability, unsubscribe handling) not
  bundled into this stage without asking first.
- **No real spam rate-limiting on the lead form** — see above; RLS plus
  the honeypot plus staff triage is the free-tier answer, not a
  dedicated rate-limit store.

## Performance advisor cleanup

Prompted by a "check everything, tell me what's pending" pass. Fixed
what was safely fixable:

- **18 unindexed foreign keys** (`accounts.account_manager_id`,
  `activities.author_id`/`project_id`, `checklist_runs.done_by`/
  `template_item_id`, `content_calendar.owner_id`/`project_id`,
  `deliverables.created_by`/`project_id`, `expenses.created_by`/
  `project_id`, `keyword_checks.checked_by`,
  `offpage_activity_entries.created_by`,
  `offpage_recurring_runs.done_by`, `portal_comments.author_id`,
  `reports.generated_by`, `team_members.account_id`,
  `technical_audits.run_by`) — every one flagged by the linter, all
  single-column, all a plain `create index`.
- **`team_members.team_read`** was calling `auth.jwt()` per row
  instead of once per query — wrapped it in a scalar subquery
  (`(select auth.jwt())`) so Postgres caches it.

Deliberately left two advisor items alone:
- **`unused_index`** (now 27 findings) — nearly all of them are the
  indexes just added above, or `attendance_entries`/`member_leave`'s
  from the previous change; "unused" only means the app hasn't been
  used enough yet to hit them, not that they're wrong.
- **`multiple_permissive_policies`** (135 findings) — this is the
  is_staff()-read + admin/manager-write shape used on nearly every
  table in this app, by design since Stage 0. Collapsing it into one
  OR'd policy per table/action would mean touching every RLS policy in
  the repo for a cost that only matters at a row-count scale this app
  (5 accounts, 6 staff) is nowhere near. Not worth the risk.

Two things flagged in that same check are outside what tools here can
do at all: `RESEND_API_KEY` still isn't set (needs your own free
Resend account — everything else about reports works, they just can't
send until that key exists), and three Edge Functions whose features
were removed (`sync-meta-performance`, `public-api`, `submit-lead`)
are still deployed on Supabase — this session can delete a function's
source but not the deployed function itself; delete them from the
dashboard if you want them fully gone. Leaked-password-protection is
also still off in Supabase Auth — a dashboard toggle, not something
any tool here can flip.

(`supabase/migrations/20260922330000_performance_indexes.sql`)

## What's next

Pick from the cut list above, or scope net-new "Stage 10" work. Ask
before starting a fork this size, same convention every stage here has
followed.
