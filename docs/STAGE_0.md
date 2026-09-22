# Stage 0 — state of the build

This documents what actually exists in this repo right now, what's
deliberately deferred, and exactly what's needed from you to unblock the
rest. Read this before assuming any of Stage 0's six workstreams are
"done" in the sense of live and tested.

**Update, verified live as of Stage 9:** everything in "What's blocked"
below has since been resolved — Travel Roach is a real, active Supabase
project (not the placeholder this doc originally described), `app/
.env.local` and Google OAuth are configured (sign-in works end to end),
the nightly backup workflow and Cloudflare deployment are both live, and
`team_members` has the real roster (confirmed: `vrbonkers@gmail.com` as
admin, RLS gating a non-member to `/unauthorized` as designed). The
narrative below is kept as the historical record of how Stage 0 actually
started, not a current TODO list.

## Why this session diverged from the original brief

`00-START-HERE.md` and the design docs describe rebuilding a front end
around an **existing production Supabase app** (a 1,400-line
`index.html`, already in daily use). That file was not available in this
session — only the planning documents (`docs/DESIGN_HANDOFF.md`,
`designs/*.dc.html`) were. There is also no real Supabase project
connected here; the only project visible was an unrelated one
("VR Bonkers").

So this build is **greenfield, guided by the design spec**, not a literal
port of a file that was never provided. Concretely, that changes two of
the six Stage 0 workstreams:

- **0.2 "commit the current `index.html` as the baseline"** — didn't
  happen; there was no file to commit. `supabase/migrations/20260919100000_baseline_schema.sql`
  is a **reconstruction** of what the legacy schema is described to
  contain (team_members, projects, assignments, a monthly checklist, an
  off-page module, keyword rank checks) — not a pull from a real
  database. Its header comment explains this and what to do once a real
  project is connected.
- **0.3 "stop the re-render data loss"** — this bug is specific to the
  legacy app's `render()`-on-every-load, `innerHTML`-replacing pattern.
  There is no such pattern here: the new app uses TanStack Query and
  component-level React state from the start, which is structurally
  immune to that class of bug. Nothing to patch. If a real legacy
  `index.html` turns up later, 0.3's actual patch work (skip re-render
  while focused, ignore self-originated realtime events, preserve
  scroll/tab) still needs doing on that file specifically.

Everything else (0.1, 0.4, 0.5, 0.6) is built as originally scoped.

## What's actually built

| Workstream | State |
|---|---|
| 0.1 Roles & RLS | Migration written (`supabase/migrations/20260919100100_stage0_roles_rls_audit.sql`) against the reconstructed baseline. **Not applied to any database** — there is nothing to apply it to yet. |
| 0.2 Migrations & environments | Supabase CLI migration structure in place (`supabase/migrations/`, `supabase/config.toml`, `supabase/seed.sql`). No staging project exists yet. |
| 0.3 Re-render data loss | N/A — see above. |
| 0.4 Error & empty states | Built into the app skeleton from the start: `useProjects()` throws real errors (no `?? []` masking), the projects screen renders distinct loading/error/empty UI. |
| 0.5 Audit log | Table + trigger in the same RLS migration, attached to every mutable Stage 0 table. |
| 0.6 App skeleton | `app/` — Vite + React + TS, TanStack Query, Tailwind v4 + hand-rolled shadcn-style primitives, React Router, Google-sign-in gate, a `RequireMember` gate that routes an unrecognised account to `/unauthorized` instead of a blank/loading screen forever, and the Projects list screen wired to Supabase via TanStack Query. `npm run build` and `npx tsc -b` both pass clean. |

Nothing has touched a live database. All SQL here is for review.

## What's blocked, and exactly what unblocks it

1. **A real Supabase project.**
   - If the actual production project exists somewhere you have access
     to but this session didn't: give me its project ref, and run
     `supabase db pull` against it instead of trusting the reconstructed
     baseline — then we reconcile column/table names before anything
     else proceeds.
   - If it doesn't exist yet: create one (free tier), then
     `supabase link --project-ref <ref>` and `supabase db push` to apply
     the two migrations here — after you've reviewed them, per your own
     working rule.
   - Either way, also create the second free project for staging once
     the schema is settled.

2. **Google OAuth credentials** for Supabase Auth (`supabase/config.toml`
   references `env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)` /
   `env(SUPABASE_AUTH_GOOGLE_SECRET)`) — from Google Cloud Console.

3. **`app/.env.local`** — copy `app/.env.example` and fill in
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from the project's API
   settings. The app throws a clear error at startup if these are
   missing rather than failing silently.

4. **`PROD_DB_URL` repo secret** (Settings → Secrets and variables →
   Actions) for `.github/workflows/nightly-backup.yml` — the connection
   string from Database → Connection string → URI. The workflow no-ops
   until this exists; it does not fail silently, it logs why it skipped.

5. **Cloudflare Pages project**, connected to this repo: build command
   `npm run build` with root directory `app`, output directory
   `app/dist`, and the two `VITE_*` env vars set in the Pages project
   settings.

6. **Seed `team_members` with the real roster** (at least one admin —
   see `supabase/seed.sql` for the shape), then test Stage 0.1's exit
   criterion directly: sign in with a Google account **not** in that
   table and confirm you land on `/unauthorized` with zero rows
   readable from any table, then sign in as a real member and confirm
   only assigned projects are visible.

## Repo layout

```
docs/DESIGN_HANDOFF.md         Full product spec, screens, design tokens
docs/STAGE_0.md                This file
designs/*.dc.html               Design references (open in a browser)
schema/*.sql                    Original SQL handoff, unmodified, for reference
supabase/migrations/*.sql       The actual migrations, in application order
supabase/config.toml            Supabase CLI project config
supabase/seed.sql               Local/staging-only placeholder seed data
.github/workflows/              Nightly backup (Stage 0.2)
app/                             Vite + React + TS app
```
