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
- **Leave & Attendance** (`/attendance` — see "Leave & Attendance (new
  tab)" below for what it was) — removed outright by request ("Remove
  Section - Leave & Attendance"). `member_leave` had 0 rows;
  `attendance_entries` had exactly 1 real punch-in row, which went with
  the table. The Dashboard's "My work today" card lost its punch-status
  badge and "Go to attendance" link along with it — "Hours this week"
  (from `time_entries`, unrelated to punch clocks) stayed.

If any of these are ever wanted back, they need to be rebuilt from
scratch — the tables and Edge Function source are gone, not just
hidden.

(`supabase/migrations/20260922210000_remove_deals_utm_developer.sql`,
`supabase/migrations/20260922230000_remove_task_templates.sql`,
`supabase/migrations/20260922240000_remove_capacity_and_leads.sql`,
`supabase/migrations/20260922270000_remove_tasks.sql`,
`supabase/migrations/20261112100000_remove_leave_and_attendance.sql`)

## Leave & Attendance (new tab) — since removed, see "Removed by request" above

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

## Bug: Account page crashed for regular team members

Reported as "Couldn't load this account — Cannot coerce the result to
a single JSON object" for a `member`-role user (confirmed against a
real login: Malvika, assigned to Aspire Square, signed in
2026-09-23). Root cause: when the Engagement workspace folded into the
Client page, that page became the daily hub for Keywords, Activities,
Checklist and Log hours — every assigned staff member needs it. But
`useAccount()` still read the whole `accounts` row in one `.single()`
query under the original admin/manager-only `accounts_read` policy
(kept narrow on purpose, so retainer/hours_budget/notes don't leak).
For anyone else, that query returned zero rows, `.single()` threw, and
the **entire page** failed — including the project-scoped sections
that user did have access to.

Fixed with the same pattern `list_accounts_directory()` already
established: a new `get_account_directory(p_account_id)` SECURITY
DEFINER function returns the safe fields (name, website, industry,
health, renewal_on) to any `is_staff()` caller.  `useAccount()` now
uses `.maybeSingle()` and falls back to this function when the full
row is blocked, leaving the financial fields (retainer, hours budget,
notes, account manager) null rather than crashing. `contacts_read` and
`activities_read` (client stakeholders, call/meeting log — not
financial) widened straight to `is_staff()`, same reasoning as the
roster. Two other queries on the same page had the identical
`.single()`-on-`accounts` crash risk (`ChurnRiskCard`'s churn score,
which reads invoice/billing signals, and the Billing page's
profitability view) — rather than widen those, gated their
entry points (the "Churn risk" card, and the "Edit client" / "Billing"
buttons) to admin/manager, since that content is genuinely financial
and a regular member clicking into it would just hit another dead end.

(`supabase/migrations/20260923100000_fix_account_page_for_staff.sql`)

## Sitewide checklist — merged in a 109-task Master SEO Tracker

User uploaded `Master_SEO_Tracker.xlsx` — a consolidated methodology
checklist merged from 7 source workbooks, covering Planning, Technical
SEO, Content, On-page SEO, Structured data, AEO and GEO, Off-page SEO,
Local SEO, Ecommerce, International SEO, Migration and launch, User
experience, Measurement and Keyword research (109 tasks, blank/unfilled
— a template, not client data; its "Source Library" tab is raw
provenance from the merge, not itself importable). By request ("mix
both 81 item checklist and 109 task as well") these 109 tasks were
added as new `checklist_template_items` rows alongside the 53 items
already active from the original 81-item checklist — not a
replacement. The one exact category-name match, "Local SEO" (5 old +
4 new), merges into a single section automatically, since the
Checklist page already groups by category text; the other 13 new
categories render as new sections. Each new item's `reference_tag`
holds its original Task ID (`SEO-001`..`SEO-109`) from the source
sheet.

Deliberately left alone: the 28 Technical Foundation / On-Page &
Structured Data items that were deactivated earlier this session when
those two categories became the dated Backlinks/On-Page/Technical
activity-group system — reactivating them would track the same work
two different ways at once. Checklist is now 162 active items across
20 category sections (was 53 across 7); no schema or UI change was
needed, since the Checklist page already reads this table dynamically.

(`supabase/migrations/20261005100000_merge_master_seo_tracker.sql`)

## New staff Dashboard (the app had none)

The root route used to just redirect straight to `/clients` — there was
no landing page for staff at all. By request ("make dashboard
proper"), added one at `/dashboard` (now the default landing route,
and the first sidebar item), with three sections scoped to who's
looking rather than one query widened to fit everyone:

- **Agency overview** (every role): active-client count, a
  healthy/watch/at-risk breakdown, and renewals due in the next 60
  days — all read through `list_accounts_directory()`, the same
  non-financial, any-staff-readable function the Clients page already
  uses, so this works identically for a `member` as for an admin.
- **My work today** (every role, personalized): the signed-in member's
  own assigned clients with a pending-checklist count per engagement
  this month, and hours logged this week. (Originally also showed
  today's punch status with a link into Leave & Attendance — that tab
  was removed shortly after, see "Removed by request" below.) Every
  query here is filtered to the caller's own `member_id` and leans on
  RLS's existing "projects I'm on" scoping (`assignments`,
  `time_entries`, `checklist_runs`) — no new policies needed, and
  nothing to widen.
- **Business overview** (admin/manager only, gated the same way the
  Account page's Billing/Edit buttons already are): total monthly
  retainer, labor cost, expenses and profit aggregated across every
  account, plus the list of accounts flagged Watch or At risk. This
  reads `accounts.retainer_cents` and `member_rates` directly — both
  already admin/manager-only under existing RLS — rather than
  recomputing the full per-account churn-risk score (that stays a
  drill-in on the Account page itself; flagging by `health` here is
  the lightweight "glance" version).

No new tables or migrations — every number comes from data and RPCs
that already existed (`list_accounts_directory`, `assignments`,
`time_entries`, `checklist_runs`/`checklist_template_items`,
`accounts`, `member_rates`, `expenses`). New: `features/dashboard/
use-dashboard.ts` (the three hooks above) and `dashboard-page.tsx`.

(A GitHub repo was floated as a visual reference for this — it turned
out to be the retired Kubernetes Dashboard, a cluster-admin UI in a
different stack entirely, so nothing from it carries over; this was
built to match the app's own existing card/stat-tile conventions
instead.)

### Visual pass — "the design is very old"

A second repo was floated as a design reference too
(`nexu-io/open-design` — OpenDesign, a full local-first AI design
workspace with its own Next.js app, agent/MCP integration, and a
library of design-system/template packages including a "dashboard"
template). It's a platform for generating designs with a coding agent,
not a drop-in component library, so there was nothing to literally
port from it here — the actual ask was "make it look better," which
this addresses directly against the app's own tokens. Reworked all three
Dashboard sections in place, still inside the app's existing design
tokens (`index.css` — no new colors, fonts, or a second visual
language that would clash the moment you click through to Clients or
Billing):

- Every stat now sits in an icon tile (`lucide-react`, already a
  dependency) tinted with the same pill colors `Badge` already uses —
  blue for neutral counts, green/amber/red for
  healthy/watch/at-risk and profit/loss — instead of a bare number in
  a plain box.
- **My clients** rows (in "My work today") now show a real progress
  bar + percentage per engagement (`ProgressBar`, the same component
  `checklist-card.tsx` already uses), replacing the raw "162 pending /
  162" fraction, which read as broken rather than "0% done so far
  this month."
- List rows (renewals, flagged accounts) gained a hover affordance
  (arrow fades in) and color-coded urgency on renewals — red inside 7
  days, amber inside 30, neutral beyond that — instead of flat mono
  text.
- The header is now a time-of-day greeting with the signed-in
  member's first name, replacing the generic "AT A GLANCE" label.

No data/hook changes — `use-dashboard.ts` is untouched; this was a
presentation-only pass over `dashboard-page.tsx`.

### Second pass — real charts, not just colored boxes

Followed up ("make sure dashboard... are good," left to judgment) by
pulling in **Recharts** — already a project dependency per the
original design handoff (`docs/DESIGN_HANDOFF.md`: "Charts | Recharts
| Trend lines and deltas") but never actually used anywhere until now:

- **Client health mix** (Agency overview) — the separate Healthy/
  Watch/At-risk stat tiles became one small donut chart + legend,
  reading as a proportion at a glance instead of three numbers you
  have to add up yourself.
- **Where the retainer went** (Business overview) — a new horizontal
  bar comparing Labor / Expenses / Profit in dollars for the month, so
  "is this account's retainer actually covering its cost" is visible
  immediately rather than requiring mental subtraction across three
  stat tiles. Colored the same way Profit's stat tile already is
  (green if positive, red if negative).

Trade-off worth knowing: Recharts adds real weight to the bundle (the
main chunk's gzip size went from ~332KB to ~432KB) that every staff
member now pays on login, since Dashboard is the landing page. Not
code-split — this app has no lazy-route-loading set up anywhere yet,
and adding it just for this would be new infrastructure, not a
Dashboard change; flag it if load time on a slow connection ever
becomes a real complaint.

## App-wide visual refresh + tabbed Client page

Still "very old" after the above, with the brief widened to "every
page... with well formatted and proper tabbing" and the actual visual
direction left to judgment (no reference site given). Two parts:

### 1. Shared primitives, not per-page rewrites

Every staff page already builds on the same four components
(`Card`, `Button`, `Badge`, the sidebar), so the highest-leverage
place to modernize was there, not page-by-page:

- **`Card`** — radius 12px→14px, `overflow-hidden` (so a table header's
  tint clips cleanly to the rounded corner instead of poking past it),
  and a real default shadow (`--shadow-sm`, new in `index.css` along
  with `--shadow-md`/`--shadow-lg`) instead of a flat border with no
  elevation at all. `CardHeader` gets a faint tint and `CardTitle`
  tighter letter-spacing.
- **`Button`** — radius 8px→10px, a subtle shadow + hover-lift on the
  primary variant, and a pressed-state scale-down (`active:scale-98`)
  for tactile feedback that wasn't there before.
- **Sidebar** — every nav item now has a `lucide-react` icon
  (previously text-only), plus a left accent bar on the active item
  instead of relying on background color alone, and the "Signed in"
  footer now actually names who.
- A handful of ad-hoc `rounded-[12px]` boxes that predated the `Card`
  component (on Clients, Keywords, Search & Analytics) got bumped to
  match (`14px` + the same shadow token) so nothing reads as a
  leftover from before this pass.

No new colors, fonts, or a second visual language — same tokens
(`index.css`), just actually used for depth/hierarchy instead of flat
borders. This alone changes how every page looks, since they all share
these components; it's why there was no need to rewrite Clients,
Assignments, Billing or Settings individually.

### 2. The Client page, tabbed

`/clients/:accountId` (the "inner page") had grown into one 1,200-line
component: stat tiles, performance tiles, assigned team, log hours,
Keywords, Activities, Checklist, an activity feed, traffic/custom
goals, contract details, contacts, deliverables, portal comments,
churn risk, technical audit and portal users, all stacked in one
scroll — plus four *more* sections (Search & Analytics, Content
calendar, Reports, Billing) that required leaving the page entirely
onto a separate route with its own duplicate header. Restructured into
one tabbed shell, all eight sections as real routes so the URL always
matches the open tab (bookmarkable, survives refresh, back/forward
work normally) rather than client-side-only tab state:

- **`AccountTabsLayout`** (new) owns the account fetch, loading/error
  states, the back link, the name/health header, Edit/Delete client,
  and the new **`Tabs`** primitive (`components/ui/tabs.tsx` — router-
  driven underline tabs, the same pattern as the header component
  itself). It renders the active tab via `<Outlet context={{ acc,
  accountId }} />`.
- **Overview, Keywords, Activities, Checklist** are new tab components
  (`account-overview-tab.tsx` + the three smaller ones) that pull
  `{ acc, accountId }` from that context via a new `useAccountContext()`
  hook — the account is fetched once in the layout, not re-fetched
  per tab switch. Keywords/Activities/Checklist each show a plain
  "set up an engagement first" prompt when `acc.projects` is empty,
  instead of a blank tab.
- **Search & Analytics, Content calendar, Reports, Billing** are the
  same four pre-existing pages, unchanged in substance — just stripped
  of their own duplicate back-link/name header (the shared layout now
  owns that) since nesting them under `AccountTabsLayout` as child
  routes means they no longer need to assert their own identity. They
  still read `accountId` via `useParams()` exactly as before (route
  params resolve through the whole nested path), so none of their own
  data-fetching changed.
- Billing's tab only appears for admin/manager, matching its existing
  page-level gate — the gate didn't move, just where it's expressed.

No visual direction was supplied to copy, so this followed the "modern
SaaS dashboard" instinct (more depth, clearer hierarchy, icons,
underline tabs) while staying inside the app's own established tokens
— deliberately not a wholesale re-skin with new colors.

### Matched against real SE Ranking screenshots

The user then supplied actual screenshots of SE Ranking's own
dashboard, rankings table, and empty states — the first real visual
reference this redesign had, vs. guessing. Pulled in concretely:

- **Cool slate-blue neutrals, not warm cream.** `index.css`'s `paper`/
  `surface`/`ink`/`border` tokens were warm (olive/beige-tinted) from
  the original "editorial" design brief; SE Ranking (and most SaaS
  dashboards) run cool blue-gray. Re-hued every neutral token to a
  blue-gray family at the same lightness steps — same contrast, same
  structure, just a different hue family. Signal colors
  (green/amber/red) and the agency's own brand green were left alone
  on purpose: those are semantic/identity colors, not neutrals, and
  warm semantic colors on a cool gray UI is exactly how SE Ranking
  itself (and GitHub, Linear, etc.) do it.
- **Primary buttons are brand green, solid** — SE Ranking's own
  "CREATE PROJECT" convention is a solid green CTA, not black. Swapped
  `Button`'s `primary` variant from `bg-ink` to `bg-brand`. The app's
  actual brand green (`#1f5c46`, already used for the white-label
  portal) was kept rather than adopting SE Ranking's brighter kelly
  green — same convention, this app's own identity color.
- **Breadcrumbs** (`components/ui/breadcrumb.tsx`) — `Clients ›
  {Account name}` on the Account page, replacing the plain "← All
  clients" text link, matching SE Ranking's "Keppler Speakers ›
  Rankings › Detailed" pattern (two levels here, not three — the Tabs
  bar right below already names which tab is open, so a third
  breadcrumb segment would just repeat it).
- **Circular score badges**, not pastel pills — SE Ranking's content
  scores render as solid-colored filled circles with white text
  (`"67"` on a green disc), not a soft tinted pill. Rebuilt
  `technical-audit-card.tsx`'s Lighthouse scores as `ScoreCircle`
  (solid green/amber/red background, white mono text) instead of
  `Badge`.
- **Keywords table**: the most-recent date column now gets a subtle
  background tint (matching SE Ranking's shaded "current" column in
  its own rankings history view), and each rank cell is a small
  colored pill-badge (`RankBadge`) instead of plain colored text.
- **`EmptyState`** (`components/ui/empty-state.tsx`) — a shared
  centered icon-circle + heading + description + optional action,
  matching the clean empty states SE Ranking uses for "connect your
  analytics" / "no audit yet" screens. Applied to the three
  no-engagement tab prompts (Keywords/Activities/Checklist) and the
  Clients list's "no clients yet" state, replacing three near-duplicate
  inline versions of the same pattern.

Deliberately not chased, to keep this a bounded pass rather than a
rebuild: SE Ranking's two-tier sidebar (an icon-only rail plus a second
expandable panel) — this app has ~5 top-level destinations total vs.
SE Ranking's dozens, so a single-column icon+label sidebar already
fits; per-row colored tag stripes in the rankings table — purely
decorative, no data behind them even in SE Ranking's own UI; and
sparklines under each top-level stat — would need real historical
deltas we don't compute anywhere yet, and fabricating a trend line
with no real data behind it was ruled out rather than attempted. (The
segmented position-range filter *was* built — see below; it turned
out to have a real data model after all.)

## Real drill-through features (not just styling)

More screenshots followed, including interactive bits (SE Ranking's
position-range filter, its clickable KPI numbers, chart legend
toggles, a jumped/dropped/unchanged movement panel). Asked directly
which of those to actually build, since some are real features, not
visual choices — toggleable chart legends and clickable "jump to
detail" numbers need interactivity + a target to link to, not CSS.
Picked: build the ones with real data behind them already, skip the
ones that would need fabricating data or a feature this app doesn't
have (Page Changes Monitor — page-diffing/crawling — was flagged as
entirely out of scope here, not attempted).

What has real data and got built:

- **Keywords position-range filter** (`keywords-section.tsx`) — the
  Tracked/Top 3/Top 10/Top 30 stat tiles are now clickable and filter
  the table to that tier (plus a new "Not ranked" tile), mirroring SE
  Ranking's own position-filter segmented control. Filtering by
  `latestRank` was already computed per keyword — this just exposes
  it as a real control instead of a static number.
- **Jumped / Dropped / Unchanged movement breakdown** — new `jumped`/
  `dropped`/`unchanged` fields on `KeywordStats` (`use-keywords.ts`),
  computed by comparing each keyword's `latestRank` against its
  `previousRank` (both already tracked, just never compared against
  each other before). Rendered as a segmented bar + percentage
  breakdown, directly mirroring SE Ranking's "distribution of top
  positions" movement panel — and genuinely computed, not decorative.
- **Real drill-throughs**: Dashboard's "Active clients" tile and its
  health-mix legend rows (Healthy/Watch/At risk) now link to `/clients`
  and `/clients?health=watch` etc. — `ClientsListPage` gained a
  `health` query-param filter (with a visible "× clear" chip) to make
  that a real destination, not a dead link. The Account Overview tab's
  "Contacts" stat now jumps to the Contacts card on the same page.

Not built, and why: **toggleable chart legends** — this app has
exactly two charts (Dashboard's health donut and retainer-breakdown
bar), neither multi-series in a way a toggle would do anything useful
for; there's no existing multi-line time-series chart anywhere to add
a toggle to without building a new chart from scratch first, which is
a bigger ask than "add a toggle." **Numbers styled blue because
they're clickable** — SE Ranking only tints a number blue when it
truly links somewhere; several numbers shown in later screenshots
(organic traffic, keywords) were plain dark text even in their own
app. Colored the ones that now actually link (the Dashboard tiles
above); left the rest alone rather than tinting text with nothing
behind the click.

## What's next

## Client page: horizontal tabs → nested sidebar nav

More screenshots showed SE Ranking's full sidebar depth (an icon rail
plus a "Projects" panel with a project switcher and expandable
sections — Rankings/Analytics & Traffic/My Competitors/Website
Audit/Social Media/Backlink Monitor, most with 3-6 sub-items each).
Asked directly what to do with it, since most of that maps to features
this CRM doesn't have (a crawler, a backlink index, social
auto-posting) — building that nav structure would be empty labels with
nothing behind them. Picked: restructure our own nav to the same
*pattern* (switcher + expandable groups), using only pages that
already exist.

Replaced the Account page's horizontal underline `Tabs` with a second,
in-content sidebar (`components/ui/nested-nav.tsx` + a two-column
layout in `account-tabs-layout.tsx`), closely mirroring SE Ranking's
icon-rail-plus-panel structure (our existing dark `Sidebar` ≈ their
icon rail; this new panel ≈ their "Projects" panel):

- **A real account switcher** at the top of the panel — a `<select>`
  reading the same `list_accounts_directory()` roster the Clients list
  already uses, navigating to another client's Overview on change.
  Not decorative: it actually switches, same as SE Ranking's project
  dropdown.
- **Flat links** for single-view destinations (Overview, Keywords,
  Activities, Checklist, Billing) — these don't have sub-pages, so
  nesting them would be forced.
- **One real expandable group, "Analytics & Reporting"** (Search &
  Analytics / Content calendar / Reports) — the one place three
  existing pages share an obvious theme, mirroring SE Ranking's
  "Analytics & Traffic" grouping without inventing categories that
  don't fit. Defaults open when one of its pages is active, otherwise
  follows the user's own last toggle (derived from state, not an
  effect — avoids a redundant render each time the active route
  changes).
- Health badge and Edit/Delete client actions moved into this panel's
  header area / the content column respectively; the top breadcrumb
  stays put, matching SE Ranking's own layout (breadcrumb spans the
  full width above both the switcher panel and the main content).

## What's next

Pick from the cut list above, or scope net-new "Stage 10" work. Ask
before starting a fork this size, same convention every stage here has
followed.
