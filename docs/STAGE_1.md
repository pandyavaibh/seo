# Stage 1 — CRM core

Built on top of a **verified** Stage 0 (see `docs/STAGE_0.md` — every
exit criterion checked against the real Travel Roach project, not just
"code written"). This is genuinely live: applied to production, not a
draft.

## What's built

- **Migration** (`supabase/migrations/20260921110500_stage1_crm_core.sql`),
  applied to Travel Roach: `accounts`, `contacts`, `deals`, `activities`,
  and `projects.account_id`/`project_type`/`stage`/`due_on`/
  `weekly_hours`/`health` to attach engagements to accounts. RLS scopes
  all four new tables to admin/manager (commercial data); audit log
  triggers on each, matching the Stage 0.5 pattern.
- **Clients screen** (`/clients`) — table of accounts: health pill,
  engagement count, staffed avatars, renewal date (amber within 90
  days). Loading/error/empty states.
- **Account record screen** (`/clients/:accountId`) — engagements
  attached to the account, an activity timeline with a working
  "log activity" composer (writes to `activities`, RLS-checked, audit-
  logged), a contract card (retainer, renewal, account manager, hours
  budget), and a contacts card.

## Deliberate scope cuts

- ~~**Deals aren't surfaced in the UI yet.**~~ Built later in this
  session: a `/deals` screen — flat table (not a drag-drop Kanban),
  stage as a colored pill with an inline select to move it through the
  pipeline, "New deal" form linking to an account. No design in
  `docs/DESIGN_HANDOFF.md` covered this, so it follows the app's
  existing table-page conventions rather than a bespoke layout.
- **The account record's stat tiles are not the ones in the design
  file.** The design shows Organic clicks / Conversions / Keywords top
  10 / Links live / Hours logged — all of that requires data sources
  that don't exist yet (GSC/GA4 ingestion is Stage 4, hour logging is
  Stage 2). Showing fabricated numbers there would violate the same
  principle Stage 0.4 exists to enforce (no `res.data || []` masking
  what's actually missing). Tiles here show what's real right now:
  engagement count, contact count, hours budget, retainer.
- ~~**"Add client" and "New engagement" buttons are disabled**~~ — no
  longer true. Both were wired up in a later pass: "Add client" on the
  Clients list, "New engagement" on the Account record, "Edit client"
  and full contact add/edit/remove too. See the commit history from
  `Wire up real "Add client" flow` onward.
- ~~**No delete for clients, and onboarding a client took three separate
  trips.**~~ Also since fixed:
  - **"Add client" is now a full onboarding flow** — client info, an
    optional first engagement, and staffing it, all in one submit
    (`useOnboardClient` in `use-accounts.ts`). The old separate steps
    (New engagement on the account page, Staff someone on the project
    page) still work too, for adding a second engagement or restaffing
    later.
  - **"Delete client"** on the Account record (admin/manager only),
    matching "Delete project"'s confirm-and-warn pattern. This needed a
    schema fix: `projects.account_id` was the one accounts-referencing
    foreign key still `NO ACTION` instead of `CASCADE` — every other
    table under an account (contacts, deals, invoices, reports, ...)
    already cascaded, so a client with any engagement on it silently
    couldn't be deleted at all. Fixed in
    `supabase/migrations/20260922150000_cascade_delete_account_projects.sql`.
  - **An `/assignments` overview page** (admin/manager) — a grid of
    every engagement × every team member with a toggle chip per cell,
    for staffing at a glance across the whole roster rather than one
    project at a time. Modeled directly on the real production
    tracker's own Assignments admin screen (a separate, simpler
    Supabase-backed app at vrbonkers.com/tracker/, reviewed by reading
    its source directly). Deliberately additive: this CRM keeps its
    richer per-assignment `weekly_hours` (used by Stage 3 capacity) and
    the `accounts`/`projects` split (used by billing, reports, the
    portal) rather than collapsing to the tracker's flatter,
    name-only-project model — that would break Stage 3 and Stage 7.
- **The design's "Next report" card is cut entirely** — it's a Stage 7
  (reporting) concept with no backing data yet; there's nothing honest
  to put in it.

## What Stage 2 needs before it starts

Real accounts, contacts, and at least one project actually staffed
against an account — right now Travel Roach has the schema but zero
rows in any of these tables. Add real data (or ask me to seed a
placeholder client to develop against) before building the Project
workspace screen, since it needs at least one real project-under-
account to design and test against.
