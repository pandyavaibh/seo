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

- **Deals aren't surfaced in the UI yet.** The table and RLS exist
  (`schema/002_stage1_crm.sql`'s pipeline concept), but no screen uses
  them yet — the design spec doesn't call for a deals view in Stage 1's
  two screens (Clients, Account record). Add it when there's an actual
  pipeline screen to build.
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
