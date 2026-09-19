# Handoff: In-house SEO CRM

## Overview

An internal CRM for an SEO agency running **20+ client engagements across 8 accounts with 10 team members**. It replaces a spreadsheet-and-single-file-app setup with one system covering client management, SEO project delivery, team capacity and skills, per-task hour logging, backlink production, and performance data pulled from Google Search Console, GA4 and Meta.

It is **internal only** — not a product to sell, and it must run at **$0/month infrastructure cost**.

There is an existing working application (`index.html`, a single 1,400-line vanilla-JS file on Supabase) already in daily use by the team. It is not being thrown away: the database stays, the front end is rebuilt around it screen by screen.

## About the design files

The `.dc.html` files in `designs/` are **design references created in HTML** — prototypes showing intended layout, data shape and behaviour. They are **not production code to copy**. Recreate them in the target stack (React + TypeScript; see below) using its own components and conventions.

Each `.dc.html` file opens directly in a browser. `support.js` and `doc-page.js` must sit alongside them (they do in this bundle).

## Fidelity

**High fidelity.** Colours, typography, spacing and interaction behaviour are final and should be matched closely. The data is invented sample data — replace with real records.

---

## Technology stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| Database | Supabase Postgres (free tier) | Already in production. Commercial use is permitted on free. |
| Auth | Supabase Auth + Google OAuth | Working today; allowlist in `team_members`. |
| Front end | Vite + React + TypeScript | No SSR needed — all queries go to Supabase and are policed by RLS, so the app is a static bundle. |
| Data fetching | TanStack Query | Solves the current silent-failure and full-re-render problems structurally. |
| Styling | Tailwind + shadcn/ui | A CRM is tables, dialogs, date pickers, forms. |
| Charts | Recharts | Trend lines and deltas only. |
| Background jobs | Supabase Edge Functions + `pg_cron` | Needed from Stage 4 (nightly GSC/GA4 pulls). |
| Hosting | Cloudflare Pages | Free for commercial use, unlimited bandwidth, preview URL per branch. |
| Migrations | Supabase CLI + Git | No more schema edits in the dashboard. |
| Backups | GitHub Actions nightly `pg_dump` | **Required** — the Supabase free plan has no backups and no PITR. |

**Free-tier constraints to design around**

1. Free projects pause after **7 days of no database activity**. Daily internal use never trips this; the staging project will — resume it manually or ping it.
2. **500 MB database cap per project.** Only Stage 4 metric data has real volume: keep daily rows for 90 days, roll older data into monthly aggregates, keep query-level detail only for tracked keywords. At 8–10 properties this stays well inside the cap.
3. No backups on free — hence the GitHub Action above.

Escape hatch if the cap is ever hit: Oracle Cloud always-free VM running self-hosted Supabase. Still $0, but you own patching and uptime.

---

## Build order

Stage 0 is infrastructure only and blocks everything else. Full stage plan is in `designs/SEO CRM Development Plan.dc.html`; Stage 0 detail with SQL is in `designs/Stage 0 - Foundation and Tech Stack.dc.html`.

- **Stage 0 — Harden the foundation (2 weeks).** RLS + roles, migrations + staging, fix the re-render data loss in the legacy app, error/empty states, audit log, app skeleton. `schema/001_stage0_rls.sql` is the starting SQL.
- **Stage 1 — CRM core (3–4 weeks).** Accounts, contacts, deals, activity timeline, renewals. `schema/002_stage1_crm.sql`. Screens: Clients, Account record.
- **Stage 2 — Project & task engine (4 weeks).** Templates, recurring monthly work, tasks, hour logging. Screen: Project workspace.
- **Stage 3 — Team, strength & capacity (3 weeks).** Skills matrix, availability, allocation, utilisation. Screen: Capacity & strength.
- **Stages 4–8.** Search performance (GSC/GA4), backlink production, social/lead capture, reporting + client portal, intelligence. Not designed yet.

The four screens in `designs/SEO CRM Screens.dc.html` cover Stages 1–3.

---

## Screens

All four live in one file (`designs/SEO CRM Screens.dc.html`) behind a left sidebar. In the real app they are routes:

| Screen | Route | Stage |
|---|---|---|
| Clients | `/clients` | 1 |
| Account record | `/clients/:accountId` | 1 |
| Project workspace | `/projects/:projectId` | 2 |
| Capacity & strength | `/capacity` | 3 |

### Shell (all screens)

- CSS grid, `216px` fixed sidebar + `minmax(0, 1fr)` main.
- Sidebar: background `#17191C`, text `#C9CBC4`, padding `20px 14px`, `gap: 24px`, `min-height: 100vh`.
  - Logo mark: `26×26`, `border-radius: 7px`, background `#1F5C46`, white monospace letter, 12px/600. Wordmark 14px/600, `#FFFFFF`, `letter-spacing: -0.01em`.
  - Nav buttons: full width, `padding: 9px 12px`, `border-radius: 8px`, 13px/500, label left + count right (11px mono, `opacity: 0.55`). Active: background `#262A2F`, colour `#FFFFFF`. Inactive: transparent, colour `#A7A9A2`.
  - Bottom card (`margin-top: auto`): `1px solid #2E3136`, `border-radius: 10px`, `padding: 13px`. Label 10px mono uppercase `letter-spacing: 0.12em` `#7E8179`; value 23px/600 white; 5px progress bar, track `#2E3136`, fill `#3F8A63`; note 11px `#7E8179`.
- Main: `padding: 22px clamp(16px, 3vw, 32px) 56px`, flex column, `gap: 18px`.
- Page header: kicker 11px mono uppercase `letter-spacing: 0.14em` `#6E7168`; H1 25px/600 `letter-spacing: -0.02em`. Primary button right-aligned.
- Buttons: primary — background/border `#17191C`, text `#F4F3EF`, 13px/500, `padding: 9px 16px`, `radius: 8px`, hover `#2C3035`. Secondary — background `#FFFFFF`, border `1px solid #DCDAD2`, text `#17191C`, hover background `#EFEDE6`.
- Cards: background `#FFFFFF`, border `1px solid #E2E0D8`, `border-radius: 12px`.
- Tables: header row background `#FAF9F6`, header cells 10px mono uppercase `letter-spacing: 0.1em` `#6E7168` weight 500, bottom border `1px solid #EDEBE4`; body rows 13px, bottom border `1px solid #F1EFE9`; clickable rows `cursor: pointer`, hover `#FAF9F6`. Wrap tables in `overflow-x: auto` with a `min-width` on the table.
- Avatar chips: circle `24×24` (`22` compact, `28`–`36` large), monospace 10px/600, background from the per-person tint palette, text `#17191C`, `title` attribute = full name.
- Status pills: `display: inline-block`, 11.5px/500, `padding: 3px 9px`, `border-radius: 999px`.

### 1. Clients

**Purpose:** scan all accounts, spot risk, jump into one.

Header kicker `8 accounts · 20 engagements`, H1 `Clients`, primary button `Add client`.

One table, `min-width: 860px`, columns:

| Column | Content |
|---|---|
| Account | Name 13.5px/500 above domain 10.5px mono `#6E7168` |
| Health | Pill: Healthy `#E2ECE5`/`#1F5C46`, Watch `#F7EDD4`/`#7A5405`, At risk `#F7E2D6`/`#8E3C10` |
| Organic clicks MoM | Number 13px mono + delta 11.5px mono/500, up `#3F8A63`, down `#C0561C`, flat `#6E7168` |
| Engagements | Count, `#45483F` |
| Staffed | Avatar chips, `gap: 3px` (distinct people across that account's projects) |
| Renewal | 12px mono; amber `#C4891C` if within ~3 months, else `#45483F` |

Row click → Account record.

### 2. Account record

**Purpose:** everything about one client on one page.

- Back link: `← All clients`, 11px mono uppercase `#6E7168`, hover `#17191C`.
- Header: kicker `{industry} · {domain}`, H1 account name. Right: health pill (12px, `padding: 5px 11px`), `Log activity` (secondary), `New engagement` (primary).
- **Stat tiles**: `grid-template-columns: repeat(auto-fit, minmax(168px, 1fr))`, `gap: 10px`, card `padding: 14px 16px`. Label 10px mono uppercase; value 23px/600 `letter-spacing: -0.02em`; note 11.5px/500, coloured by direction. Five tiles: Organic clicks, Conversions, Keywords top 10, Links live, Hours logged.
- **Two-column body**: flex wrap — left `flex: 1 1 420px`, right `flex: 1 1 280px; max-width: 340px`.
  - *Engagements* card: rows `padding: 11px 12px`, border `1px solid #EDEBE4`, radius 10, background `#FCFBF8`, hover border `#B9B6A9`. Each row: name 13.5px/500 + type 10.5px mono uppercase, avatar chips, stage pill, due date 11.5px mono right-aligned `min-width: 52px`. Click → Project workspace.
  - *Activity* card: date column 10px mono uppercase, fixed `54px`; 7px dot (`#C0561C` risk, `#1F5C46` positive, `#6E7168` neutral); text 13px `line-height: 1.45`; author 10.5px mono `#6E7168`.
  - *Contract* card: label/value rows — label 10.5px mono uppercase `#6E7168`, value 13px/500. Fields: Retainer, Client since, Renewal, Account manager, Hours budget.
  - *Contacts* card: 28px grey chip (`#EDEBE4`), name 13px/500, role 11.5px `#6E7168`.
  - *Next report* card: background `#1F5C46`, text `#EAF2ED`, H2 white 14.5px/600, body 13px, footer 10.5px mono uppercase `#A9CCBB`.

Stage pills: Discovery `#E6E9F0`/`#3A4560`, In progress `#E2ECE5`/`#1F5C46`, Client review `#F7EDD4`/`#7A5405`, Shipped `#EDEBE4`/`#5A5D55`.

### 3. Project workspace

**Purpose:** the delivery screen — tasks, who is on it, and this month's targets.

- Back link `← {client name}` → Account record.
- Header kicker `{type} · due {date}`, H1 project name; right: stage pill + `Add task`.
- **Tasks table** (`flex: 1 1 460px`, `min-width: 540px`). Card header row: H2 `Tasks` + `{n}h logged of {m}h budget` (11px mono). Columns:
  - *Task* — 13px checkbox square (`13×13`, radius 4, border `1.5px solid`): done → border and fill `#3F8A63`, text `#8C8F86`; open → border `#C3C0B5`, transparent fill, text `#17191C`.
  - *Owner* — 24px avatar chip.
  - *Logged / est* — `"{logged} / {estimate}h"`, 12px mono. Colour: over estimate `#C0561C`, met `#3F8A63`, under `#45483F`. **The first number is hours logged.**
  - *Log* — `+1h` button, 11px mono, `padding: 4px 9px`, border `1px solid #DCDAD2`, radius 6, hover `#EFEDE6`. Increments logged hours by 1 (in production: insert a `time_entry`).
- **Right column** (`flex: 1 1 280px; max-width: 340px`):
  - *Assigned team*: 28px chip, name 13px/500, role 11px `#6E7168`, right-aligned load `{booked}/{capacity}h` 11px mono coloured by ratio.
  - *This month*: three labelled 6px progress bars (track `#ECEAE2`) — Checklist complete, Links live, Hours against budget. Green `#3F8A63` under target, amber `#C4891C` approaching, red `#C0561C` over.

### 4. Capacity & strength

**Purpose:** who is overloaded, who has room, and where the skill gaps are.

Header kicker `Week 39 · 10 people`, H1 `Capacity & strength`. One table, `min-width: 880px`:

| Column | Content |
|---|---|
| Person | 28px chip + name 13px/500 + role 11px `#6E7168` |
| Projects | Active (non-shipped) count, 12px mono |
| Booked | 6px bar (`width: 230px` column) + `{booked}/{capacity}h` label, coloured by ratio |
| Technical / Content / Off-page / Analytics | Skill 1–5 in a `24×24` rounded-6 tile, mono 11.5px/600. ≥4 → `#E2ECE5`/`#1F5C46`; =3 → `#F1EFE9`/`#45483F`; ≤2 → `#F7F6F2`/`#8C8F86` |

Footnote 12.5px `#6E7168`, `max-width: 62ch`: a column where only one person scores 4+ is a single point of failure.

Load colour rule everywhere: ratio > 1 → `#C0561C`; > 0.88 → `#C4891C`; else `#3F8A63`. Bar width capped at 100%.

---

## Interactions & behaviour

- **Navigation.** Sidebar switches view; Clients stays highlighted while an account record is open. Row/card clicks drill down; back links go up one level. In production these are routes with real URLs.
- **Hour logging.** `+1h` increments that task's logged hours immediately and recalculates the header total and the "Hours against budget" bar. In production: optimistic insert into `time_entry`, reconciled by TanStack Query.
- **Derived numbers, never stored.** Every load figure is computed from current assignments: for each active (non-shipped) project a member is on, `project.hours / team.length + 2` overhead hours. Team utilisation is the sum of all booked hours over the sum of all capacities. Assigning or unassigning someone must move these numbers live.
- **Hover states.** Table rows `#FAF9F6`; bordered cards `#B9B6A9` border; secondary buttons `#EFEDE6`; primary buttons `#2C3035`.
- **Responsive.** Two-column sections use `flex-wrap` with `flex: 1 1 <basis>` and collapse to one column on narrow viewports. Tables scroll horizontally inside `overflow-x: auto` rather than squashing.
- **Loading / error / empty.** Not in the prototype and **must be added**: every query needs a skeleton, an error state naming what failed, and an empty state. The current legacy app's `res.data || []` pattern makes a permission failure look identical to no data — do not carry that over.

## State

| State | Shape | Notes |
|---|---|---|
| `view` | `'clients' \| 'account' \| 'project' \| 'capacity'` | Becomes the router in production |
| `clientId` | account id | From the route param |
| `projectId` | project id | From the route param |
| `logged` | `{ [taskId]: hoursAdded }` | Prototype only — replaced by `time_entry` rows |

Server state (TanStack Query): accounts, contacts, projects, tasks, assignments, members, time entries, monthly checklist runs, off-page runs. Realtime subscriptions on tables that two people edit at once (tasks, checklist runs) — **and ignore events originating from the current session**, which is the bug in the legacy app.

## Design tokens

**Colour**

| Token | Hex | Use |
|---|---|---|
| Paper | `#F4F3EF` | App background |
| Surface | `#FFFFFF` | Cards, tables |
| Surface sunken | `#FAF9F6` / `#FCFBF8` | Table headers, nested rows |
| Ink | `#17191C` | Primary text, sidebar, primary button |
| Ink secondary | `#45483F` | Table body text |
| Ink muted | `#6E7168` | Labels, meta |
| Ink faint | `#8C8F86` | Completed items |
| Border | `#E2E0D8` | Card borders |
| Border light | `#EDEBE4` / `#F1EFE9` | Internal dividers, row borders |
| Track | `#ECEAE2` | Progress-bar track |
| Green | `#1F5C46` | Brand accent, feature card, links |
| Green signal | `#3F8A63` | On track, positive delta |
| Amber signal | `#C4891C` | At capacity, approaching target |
| Red signal | `#C0561C` | Overloaded, overdue, negative delta |
| Sidebar surface | `#262A2F` / border `#2E3136` | Active nav, sidebar card |

Soft pill pairs: green `#E2ECE5`/`#1F5C46`, amber `#F7EDD4`/`#7A5405`, red `#F7E2D6`/`#8E3C10`, neutral `#EDEBE4`/`#5A5D55`, blue-grey `#E6E9F0`/`#3A4560`.

Avatar tints (cycle by member index): `#D9E6DE`, `#EDE3CE`, `#DCE2EC`, `#E9DCE2`, `#E0E6D4`, `#E6DFD2`, `#D6E4E6`, `#EAE0E8`, `#DFE7DA`, `#ECE5D8`.

**Type** — Instrument Sans (400/500/600/700) for everything; IBM Plex Mono (400/500/600) for numbers, labels, dates, IDs. Both from Google Fonts.

| Role | Size / weight | Extras |
|---|---|---|
| H1 | 25px / 600 | `letter-spacing: -0.02em` |
| Card H2 | 14.5px / 600 | |
| Body | 13–13.5px / 400 | `line-height: 1.45–1.6` |
| Table header | 10px mono / 500 | uppercase, `letter-spacing: 0.1em` |
| Kicker | 11px mono / 400 | uppercase, `letter-spacing: 0.14em` |
| Stat value | 23px / 600 | `letter-spacing: -0.02em` |
| Micro meta | 10.5–11.5px mono | |

**Spacing** — 2 / 3 / 6 / 8 / 10 / 12 / 14 / 18 / 22 px. Card padding `14–18px`; table cells `11–12px` vertical, `12–18px` horizontal. **Radius** — 6 (small controls), 8 (buttons, nav), 10 (nested rows), 12 (cards), 999 (pills). **Shadows** — none; separation is done with borders.

## Assets

None. No images, no icon library — the prototype uses type, colour and CSS shapes only. If you add icons, Lucide matches the weight of this system.

## Files in this bundle

```
designs/SEO CRM Screens.dc.html              Stages 1–3 screens (the main reference)
designs/SEO CRM Development Plan.dc.html     Stage 0–8 roadmap, data model, decisions
designs/Stage 0 - Foundation and Tech Stack.dc.html   Stack rationale, Stage 0 detail, SQL, schedule
designs/support.js, designs/doc-page.js      Runtime for the .dc.html files
schema/001_stage0_rls.sql                    Roles, helper functions, RLS policies, audit log
schema/002_stage1_crm.sql                    Accounts, contacts, deals, activity, tasks, time entries
00-START-HERE.md                             Paste-in brief for the first Claude Code session
```

The existing production app (`index.html`) is not included — pull it from your own copy. Note it contains the Supabase URL and publishable key inline, which is fine **only once RLS is enforced**.
