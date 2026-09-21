# SEO CRM

Internal CRM for a 10-person SEO agency running 20+ client engagements
across 8 accounts. Not a product for sale — infrastructure budget is
$0/month, free tiers only.

Read **[`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)** first — full
spec, screens, design tokens, stack decision. Then, in order:
**[`docs/STAGE_0.md`](docs/STAGE_0.md)** (done — every exit criterion
verified against the live project),
**[`docs/STAGE_1.md`](docs/STAGE_1.md)** (Clients + Account record),
**[`docs/STAGE_2.md`](docs/STAGE_2.md)** (Project workspace, core
slice) — each documents what's actually built versus what's
deliberately cut for now.

Live: **Travel Roach** (Supabase project `bmlvurfoksjlckrubehn`),
deployed at `seo.vrbonkers.workers.dev`.

## Stack

Supabase Postgres + Auth (free tier) · Vite + React + TypeScript ·
TanStack Query · Tailwind + shadcn-style components · Supabase CLI
migrations in Git · GitHub Actions nightly `pg_dump` for backups ·
Cloudflare Pages hosting.

## Layout

```
docs/                 Design handoff spec + Stage 0 state
designs/               Design references (.dc.html — open in a browser)
schema/                 Original SQL handoff, for reference
supabase/               CLI project: migrations, config, seed data
.github/workflows/     Nightly database backup
app/                    The Vite + React + TS application
```

## Working on the app

```
cd app
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

`npm run build` and `npx tsc -b` (from `app/`) must both pass clean
before anything gets pushed.

## Working on the database

Every schema change is a file in `supabase/migrations/`, applied in
filename order, reviewed before it goes anywhere near production — see
`docs/STAGE_0.md` for the current migrations and what's still needed to
actually apply them to a real project.
