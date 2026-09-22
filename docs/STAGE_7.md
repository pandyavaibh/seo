# Stage 7 — Reporting, client portal, and billing

Built from `designs/SEO CRM Development Plan.dc.html`'s Stage 7 section
— the "payoff stage": the data assembled in Stages 4–6 becomes the
thing the client sees, and the thing that gets invoiced. Same
no-paid-plan discipline as every other stage.

## What's built

- **Report builder** (`/clients/:accountId/reports`): pick a period,
  add a "next month's plan" note, and **Generate** pulls real numbers
  for that window — Search Console clicks/impressions, GA4 sessions/
  conversions, Meta reach/engagement (whichever sources are connected),
  tasks completed, backlinks placed, and keyword rank movement (up vs.
  down vs. tracked) — and freezes them into a `reports` row
  (`snapshot` jsonb). Frozen on purpose: a report generated in March
  still shows March's numbers in June even as the underlying tables
  keep changing. **PDF export** is client-side (`jspdf`, a free npm
  package — see `report-pdf.ts`) — no server-side rendering service.
  **"Send by email"** is a manual send via the `send-report-email`
  Edge Function and Resend (a free-tier transactional email API — the
  user creates the account and API key, same pattern as every other
  external credential in this app: `RESEND_API_KEY`, not yet set).
  A report starts as a staff-only draft; sending it (by email or
  "Mark as sent") is what makes it visible in the client portal.
- **Client portal** (`/portal`, `/portal/reports`, `/portal/invoices`):
  `member_role` already had `'client'` (Stage 0) but nothing used it —
  a client-role member couldn't even read their own `team_members` row
  (`team_read`'s policy was staff-only), so login dead-ended. Fixed,
  plus `team_members.account_id` now ties a client to the one account
  they can see. Every portal-visible table (`reports`, `invoices`,
  `deliverables`, `portal_comments`, and the client's own `accounts`
  row) is RLS-scoped to `account_id = auth_member_account_id()` — the
  client-role equivalent of `auth_member_id()`/`auth_member_role()`,
  never trusting anything the client-side app claims about which
  account it's showing. Reports and invoices additionally hide
  anything still in `draft` status — a client only ever sees a sent
  report or a non-draft invoice. Nothing exposes hours, cost rates, or
  margins — those tables (`member_rates`, `expenses`) have no
  client-facing policy at all. `RequireStaff`/`RequirePortal` (in
  `routes/require-member.tsx`) keep the two apps from ever
  cross-rendering: a client hitting a staff URL bounces to `/portal`
  and vice versa.
- **Billing** (`/clients/:accountId/billing`): invoices with line
  items and a status lifecycle (draft → sent → paid → overdue, staff
  updates it by hand once a client pays some other way), and expenses
  (link costs, tools, other) per account. **No payment processor** —
  see "What's deliberately not here" below.
- **Profitability** (admin-only card on the Billing page): retainer
  value minus this month's labor cost (hours logged × each person's
  hourly cost rate) minus expenses minus backlink costs placed this
  month. Cost rates live in a separate `member_rates` table, RLS-locked
  to admin only — even a manager account gets nothing back from that
  table, which is the one place the plan doc draws an explicit
  admin-vs-manager line ("Admin sees everything including rates,
  margins and invoices" vs. "Manager ... not company-wide financials").
  Rates are set from the Capacity page's "Cost rates" card (admin
  only). A person with no rate set is excluded from the labor-cost sum
  rather than guessed at — the total honestly undercounts instead of
  fabricating a number.
- **Deliverables and comment thread**: a `deliverables` list (title,
  link, date) staff add to an account, shown on both the Account
  record page and the client's portal dashboard. `portal_comments` is
  a single shared thread per account — staff and that account's client
  can both read and post; only staff can delete (moderation), nobody
  can edit.
- **Portal user invite**: an admin-only "Portal users" card on the
  Account record page creates the `team_members` row (role `client`,
  `account_id` set) that grants portal access — no direct SQL needed
  day-to-day. The person signs in with the same Google button every
  staff member uses; their Google account's email has to match exactly.

## What's deliberately not here

- **No payment processor.** "Invoice generation, payment status" is a
  record-keeping table, not online payment collection — a real
  processor (Stripe etc.) means a paid subscription and PCI scope this
  app has no reason to take on. Staff mark an invoice paid once the
  client pays some other way (bank transfer, whatever the agency
  already uses).
- **No recurring auto-scheduled report email.** "Schedulable by email"
  ships as a manual "send now" button. True scheduling (send this
  account's report automatically on the 1st of every month) would need
  a per-account send-day config plus a daily cron job checking it —
  not built here, same shape of gap as Stage 4/6's nightly syncs but
  for a feature that didn't exist before this stage.
- **No client self-service signup or password reset flow** — a client
  portal user is created by staff (the Portal users card), same
  staff-managed pattern as every other account-linked credential in
  this app.

## What's still actually open (your action)

- **Resend account + API key don't exist yet.** Nothing sends a real
  report email until a free Resend account is created and its API key
  is set as `RESEND_API_KEY` on the `send-report-email` Edge Function.
  PDF export and the client portal itself don't depend on this at all
  — only the "send by email" button does.
- **No cost rates are set yet**, so every account's profitability card
  currently shows $0 labor cost (an honest undercount, not a fabricated
  number) until an admin sets rates on the Settings page (moved there
  when Capacity & strength was removed — see docs/STAGE_9.md).

## Portal dashboard widgets (added later)

The client dashboard (`/portal`) originally only showed Deliverables
and a Latest report card built from a staff-generated report snapshot
— no live numbers, no visible conversation. Added, per request:

- **Performance tiles**: organic clicks/impressions (28d, Search
  Console), conversions (28d, GA4), keywords in top 10, and backlinks
  placed (total + this month) — a client-safe version of the same
  tiles the Account record page already showed staff
  (`use-portal-performance.ts`), leaving out anything internal (hours
  logged, off-page activity tallies).
- **Client conversation preview**: a card showing the latest
  `portal_comments` message and a total count, above the existing full
  thread.

None of the underlying tables (`search_connections`, `metric_snapshots`,
`backlinks`, `keywords`, `keyword_checks`) were readable by a client
role before this — their `*_read` policies were staff-only or
staff-or-assigned-only. Widened each with the same
`account_id = auth_member_account_id()` (or, for the project-scoped
tables, a join through `projects.account_id` via the new
`is_own_account_project()` helper) pattern Stage 7 already used for
reports/invoices/deliverables/portal_comments — write access to all
five tables is untouched and stays staff-only
(`supabase/migrations/20260922250000_portal_dashboard_widgets.sql`).
