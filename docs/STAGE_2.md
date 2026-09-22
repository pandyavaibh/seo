# Stage 2 (core slice) — Project workspace

Live on Travel Roach. Built to match the Project workspace screen in
`docs/DESIGN_HANDOFF.md`, not copied from the `.dc.html` file.

## What's built

- **Migration** (`supabase/migrations/20260921120000_stage2_tasks.sql`):
  `tasks` table, `time_entries.task_id`. RLS matches the `is_assigned`
  pattern used everywhere else; audit-logged.
- **Project workspace screen** (`/projects/:projectId`), linked from the
  Projects list and every Account record engagement row:
  - Tasks table — checkbox (todo ↔ done), owner avatar, logged/est
    hours per task, a `+1h` quick-log button.
  - Add task (manual — name + estimate).
  - Assigned team panel (name, role — see cut below on "load").
  - "This month" bars: **Checklist complete** and **Links live** run on
    tables that already existed from Stage 0
    (`checklist_template_items`/`checklist_runs`, `offpage_runs`) — no
    new schema needed for those two. **Hours against budget** uses
    `time_entries` (weekly_hours × 4 as the monthly figure, matching
    the design's own convention). ~~Both bars are aggregate-only, no
    item-level UI.~~ Both now link through to full dedicated pages —
    see "Real checklist and off-page tracking" below.

## Real checklist and off-page tracking

Rebuilt to match the user's actual live tool (vrbonkers.com/tracker/),
transcribed from screenshots rather than guessed at:

- **Sitewide Checklist** (`/projects/:projectId/checklist`): the real
  81-item checklist across 9 categories (Technical Foundation, Content
  Quality, On-Page & Structured Data, Internal Linking, Local SEO,
  AEO/GEO/AI Search Readiness, Link Authority & Spam Policy Compliance,
  SEO Strategy & Planning, Analytics/Reporting & Ongoing Monitoring),
  each item carrying a priority (High/Medium/Low) and a reference tag.
  `checklist_runs.done` (boolean) became `status`, a 4-state field
  (To Do/In Progress/Done/N/A) matching the real tool — the old
  boolean only had two of those four states.
- **Off-Page & Backlinks** (`/projects/:projectId/offpage`): the
  project's `link_target` broken down into the real tool's 13 fixed
  activity types (Guest Post, Web2.0, Document, Business Listing,
  Business Profile, Social Bookmarking, Social Content Sharing,
  Classified, Article, Contextual, Image, PR, Link Tree), each with a
  target (Business Listing is a real range, 15–20) and an
  auto-computed "remaining" (target max − done, never stored) — the
  exact behavior confirmed directly against the user's own example
  (20 target, 3 + 6 = 9 done → 11 remaining, shown automatically).
  Below that, the real tool's six recurring off-page tasks (a weekly
  project follow-up and a Friday backlink/indexing check, both with
  per-week/per-Friday instances computed from the actual month's
  calendar and never stored as fixed dates; plus four single-instance
  monthly checks) and a free-text monthly notes field.
- A shared pill nav (Sitewide Checklist / Off-Page & Backlinks /
  Keywords) ties the three views together on every project, matching
  the real tool's own tab layout. "Keywords" still lives on the main
  project workspace page (Rankings section) rather than a fourth
  dedicated route.
- **Search volume** added to `keywords` (confirmed against the user's
  own rank-tracking spreadsheet, which lists Sr. No. / Keywords /
  Search Volume) — a plain optional number entered by hand next to
  each tracked keyword, same manual-tracking approach as everything
  else in Rankings.

## Deliberate scope cuts

- **No template library.** `project_templates`/`template_tasks` and
  auto-generating a recurring instance "on the 1st" (per the roadmap)
  needs a scheduled job — `pg_cron` or a Supabase Edge Function on a
  cron trigger. That's real infrastructure to design and test, not a
  table to bolt on. Tasks are created manually for now.
- **No team "load" (booked/capacity) on the Assigned team panel.** The
  design shows `{booked}/{capacity}h` per person — that needs
  `team_members.weekly_capacity` and `assignments.weekly_hours`, both
  Stage 3 (Capacity & strength) additions that don't exist yet. Showing
  a load number without a real capacity figure would be exactly the
  kind of fabricated stat Stage 1's design cuts already ruled out.
- **No task dependencies, priority sorting, or due-date reminders** —
  the `tasks` table has `due_on` and `priority` columns (present,
  unused by the UI) but no view built around them yet.

## What's next

Stage 2's actual exit criteria ("a new client can be onboarded from a
template in under five minutes") isn't met by this slice — that
requires the template library above. Two real paths forward:

1. Build the template library + manual "apply template to project" flow
   (no recurring generation yet) — meaningfully closer to the exit
   criteria without needing a scheduled job.
2. Move to **Stage 3** (Capacity & strength — skills matrix,
   availability, the allocation planner) since the Assigned team panel
   here is visibly missing exactly what Stage 3 would add.

Ask before starting either — both are real scope, not small follow-ups.
