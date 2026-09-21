# Stage 3 (core slice) — Capacity & strength

Live on Travel Roach. Built from `docs/DESIGN_HANDOFF.md`'s spec.

## What's built

- **Migration** (`supabase/migrations/20260921123000_stage3_capacity.sql`):
  `team_members.weekly_capacity`, `member_skills` (discipline × 1–5
  level), `member_leave`, `assignments.weekly_hours`/`starts_on`/
  `ends_on`. RLS: skills and leave readable by any staff, writable by
  admin/manager (leave also writable by the member themselves).
  Audit-logged.
- **Capacity & strength screen** (`/capacity`): one table — person,
  active (non-shipped) project count, booked-vs-capacity bar (green/
  amber/red by ratio, same rule used everywhere else in the app),
  four skill-tile columns (Technical/Content/Off-page/Analytics). The
  footnote's "single point of failure" claim is computed from real
  data, not hardcoded — it names whichever disciplines actually have
  only one person rated 4+.
- Booked hours are computed in the app from `assignments.weekly_hours`
  summed per member across non-shipped projects — not a stored/derived
  DB view, matching how every other aggregate in this app is built
  (see Stage 1/2 hooks). This also deliberately diverges from
  `schema/002_stage1_crm.sql`'s reference `member_load` view, which has
  a join-filter bug: its `left join projects ... and p.stage <>
  'shipped'` in the `ON` clause doesn't exclude shipped-project hours
  from the sum (LEFT JOIN keeps the assignment row with `p` nulled out,
  not dropped) — computing it in TS avoided reproducing that.

## Deliberate scope cuts

- **No `cost_rate_cents`.** Not part of this migration at all — see the
  migration file's own header for why (would leak internal hourly cost
  to any staff account under the existing `team_read` policy).
- **No allocation planner** (drag a project onto a person, capacity
  warnings on overbooking) — the roadmap's Stage 3 description calls
  for this, but the actual designed screen (`SEO CRM Screens.dc.html`)
  is read-only: a capacity table, not a planning tool. Building a
  planner means designing a new interaction, not implementing a given
  one.
- **`member_leave` has no UI yet.** The table and RLS exist so leave
  can be logged, but nothing surfaces it — the design's Capacity
  screen doesn't show leave/availability, only current booked hours.

## Where things stand across all three stages

Stage 0 (foundation), Stage 1 (Clients + Account record), Stage 2 core
slice (Project workspace), and Stage 3 core slice (Capacity & strength)
are all live and cross-linked: Clients → Account record → Project
workspace, and Capacity stands alone. The two real gaps left across
everything built so far are the deals/lead pipeline (Stage 1, no UI)
and the template library + allocation planner (Stage 2/3, no UI) —
both are documented, not silently dropped.
