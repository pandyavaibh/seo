# Stage 5 — Backlink production (manual tracking)

Built from `designs/SEO CRM Development Plan.dc.html`'s Stage 5 section
and its `backlink` entity ("Prospect through indexed link, anchor, cost,
status"), scoped down per the user's explicit decision: **free manual
tracking only, no paid API.**

## Why manual, not automated

The plan doc's own open-decision list says referring-domain counts and
authority scores (Domain Rating, DA) require a paid API — Ahrefs, Moz,
or Majestic. Asked directly whether to add one of those subscriptions or
scope Stage 5 down to manual tracking, the user chose manual tracking —
consistent with the standing "no paid plan" constraint applied
throughout this build (same reasoning as Stage 4's Rankings feature,
which tracks keyword position by hand rather than through a paid rank
tracker).

## What's built

- **Migration** (`supabase/migrations/20260921210000_backlinks.sql`):
  a `backlinks` table — one row per prospect/placement, not a monthly
  tally. `backlink_status` enum (`prospect` → `outreach` → `placed`,
  with `declined`/`removed` as terminal states for link rot or a
  rejected pitch). Columns: `domain` (the prospect/publisher site),
  `target_url` (our page being linked to), `anchor_text`, `source_url`
  (the live URL, once placed), `cost_cents`, `contact_email`, `notes`,
  `owner_id` (staff driving outreach), `placed_on`. RLS matches every
  other project-scoped operational table (`keywords`, `offpage_runs`):
  admin/manager or staff assigned to the project can read and write;
  audit-logged.
- **Backlinks section** on the project workspace, directly below
  Rankings: prospect/outreach/placed counts, then a table — domain
  (with target URL as a subline), status (badge + inline select, same
  pattern as the Deals pipeline), anchor text, live URL (editable once
  a link goes up), cost, owner, and a remove action. Moving status to
  "Placed" for the first time stamps `placed_on` with today's date
  automatically; every other field is staff-entered, nothing computed
  or guessed.
- **Add prospect** form: domain (required), target URL, anchor text,
  owner — the pipeline starts the same way a sales/outreach CRM would,
  before there's a link at all.

## What's deliberately not here

- **No Domain Rating, Domain Authority, Trust Flow, or any other
  authority score** — these only exist through a paid API (Ahrefs, Moz,
  Majestic). Not shown as blank placeholders either; the feature simply
  doesn't claim to have them.
- **No automated referring-domain discovery** — nothing crawls the web
  or a third-party index to find backlinks that already exist. Every
  row here is one a staff member logged by hand, same honesty
  principle as Stage 4's manual rank tracking.
- **No domain-quality scoring, spam score, or link-velocity charts** —
  same reason: paid-API territory.

If the no-paid-plan stance changes later, an authority-score column can
be added to `backlinks` (or synced from a paid API into it) without a
schema rework — the manual fields this stage ships stay meaningful
either way.
