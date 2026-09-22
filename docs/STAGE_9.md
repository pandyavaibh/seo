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
- **No lead-capture web forms** — same reasoning: a real scope of its
  own (public-facing form + spam handling), not a small addition.
- **No scheduled/recurring report emails** — Stage 7 already has manual
  "send" on a built report; turning that into a schedule needs the same
  kind of `pg_cron` + Edge Function infrastructure Stage 4's nightly
  sync uses. Real infrastructure, not a checkbox.
- **No white-label branding on reports/portal** — cosmetic, deferred
  since nothing about it is blocked by cost or architecture; just not
  requested yet.

## What's next

Pick from the cut list above, or scope net-new "Stage 10" work. Ask
before starting a fork this size, same convention every stage here has
followed.
