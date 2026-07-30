# ATC Invoicer

Cross-platform desktop invoicing app for **Build With ATC**. Electron + React + TypeScript,
backed by Supabase (Postgres + Auth). Creates, manages, and exports invoices that match the
existing "Build With ATC" Excel billing template.

> Status: **Complete** — all 7 phases built. Login, clients, invoice editor with
> live preview, A4 PDF/print, dashboard with filters + statuses, settings, and
> auto-update via GitHub Releases.

## Tech stack

- **Electron** + **electron-builder** (packaging) + **electron-updater** (auto-update via GitHub Releases)
- **React + TypeScript + Vite** renderer (bundled with **electron-vite**)
- **Tailwind CSS** styling
- **Supabase JS v2** for auth + database
- **react-hook-form + zod** for forms/validation
- PDF via Electron `webContents.printToPDF` (no third-party PDF libs)
- Encrypted session persistence via `electron-store` + `safeStorage`
- Context isolation ON, nodeIntegration OFF, minimal typed preload bridge

## Project structure

```
src/
  main/       Electron main process (window, IPC, updater, PDF — grows per phase)
  preload/    Minimal typed contextBridge exposed as window.api
  renderer/   React app (Vite root at src/renderer, code in src/renderer/src)
  shared/     Types shared between main and renderer (added as needed)
supabase/
  migrations/ SQL migration(s) to paste into the Supabase SQL editor (Phase 3)
build/        Installer icons/resources for electron-builder
resources/    Runtime assets bundled into the app (e.g. logo)
```

## Prerequisites

- Node.js 20+ (developed on Node 22)
- npm 10+

## Getting started (development)

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key (Phase 2+)
npm run dev            # launches the Electron window with hot reload
```

`npm run dev` opens the app window. In Phase 1 it shows a boot screen confirming the
Electron shell, preload bridge, and Tailwind are wired up.

## Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the app in development with HMR |
| `npm run build` | Type-agnostic production build of main/preload/renderer into `out/` |
| `npm run typecheck` | Type-check main + renderer projects |
| `npm run build:unpack` | Build an unpacked app dir (quick smoke test, no installer) |
| `npm run build:win` | Build a Windows NSIS installer |
| `npm run build:mac` | Build a macOS dmg/zip |

## Database setup (run once)

The schema, security policies, triggers, seed data, and invoice-numbering function live in a
single migration. Apply it before using the app:

1. Supabase dashboard → **SQL Editor → New query**.
2. Run each migration in order (paste the whole file, **Run**, repeat):
   - [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) — core schema, RLS, seeds, invoice numbering.
   - [`supabase/migrations/002_projects_expenses.sql`](supabase/migrations/002_projects_expenses.sql) — projects + expenses, and the invoice→project link.
   - [`supabase/migrations/003_expense_markup.sql`](supabase/migrations/003_expense_markup.sql) — per-expense markup %.
   - [`supabase/migrations/004_project_codes_budgets.sql`](supabase/migrations/004_project_codes_budgets.sql) — project codes, contract budget, sub-budget categories.
   - [`supabase/migrations/005_contract_and_invoice_markup.sql`](supabase/migrations/005_contract_and_invoice_markup.sql) — contract-budget (quotation) scope items + invoice markup.
3. All are idempotent — safe to re-run; seeds insert only if missing.

This creates `profiles`, `business`, `clients`, `invoices`, `invoice_items`; enables **RLS**
(authenticated users can read/write); adds an `updated_at` trigger, a trigger that auto-creates
a `profiles` row for each auth user (with a backfill for existing users), and the
`next_invoice_no()` function that issues `YYYYMMDD-N` numbers safely. It also seeds the business
record and the 9 clients.

## Projects & expenses

Each **project** gets an auto code **`ATC<YEAR><NNN>`** (e.g. `ATC2026001`) plus a description.
Numbers are **gap-filled** per year — delete a test/quote project and its number is freed for
the next one. Invoices reference the project's **description** (never the code).

A project's detail page has three tabs:

- **Expenses** (default) — log **expenses** (description, budget category, cost, date) as work
  happens. When invoicing, **Bill from project** lists the project's **unbilled** expenses; tick
  some and they drop in as line items at **cost**, then get marked **billed** on save.
- **Contract budget** (the quotation) — **scope items** each with a **Quoted** and **Negotiated**
  price; the negotiated total is the **contract sum**. **Award** the quotation to snapshot the
  contract budget and auto-seed matching categories in **My budget**.
- **My budget** — your internal **cost budget** per category (Labor, Painting, Roofing…). Each
  shows a completion bar of **actual cost spent** vs budget — **green** under, **amber** near,
  **red** over.

**Markup** lives on the **invoice**, not the expense: a **global markup %** plus an optional
**per-line %** (they add together), baked into the unit price the client sees.

## Authentication

The app uses **Supabase Auth (email/password)** but presents it as a **username** login.
Usernames map to emails internally: username `dan` → `dan@atc.local`. There is **no public
sign-up** — users are provisioned manually in the Supabase dashboard.

### Creating the first user

1. Supabase dashboard → **Authentication → Users → Add user → Create new user**.
2. **Email:** `<username>@atc.local` (e.g. `dan@atc.local`). **Password:** set one.
3. ✅ Check **Auto Confirm User** — `@atc.local` isn't a real inbox, so the confirmation
   email can't be delivered; auto-confirm lets the account log in immediately.
   (Alternatively, disable "Confirm email" under Authentication → Providers → Email.)
4. Launch the app and sign in with the **username** (`dan`) and that password.

In Phase 3 a `profiles` table stores a display username per user; until then the app derives
the display name from the email's local part.

### Session security

On successful login the Supabase session (access + refresh tokens) is persisted **encrypted**:
the renderer's Supabase client uses a custom storage adapter that forwards to the main process,
which encrypts values with Electron **`safeStorage`** (DPAPI on Windows / Keychain on macOS)
before writing them via `electron-store`. Tokens are **never** stored in plaintext or in
`localStorage`. The session is restored on restart; **Log out** clears it.

## Configuration

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are read at build time from `.env`
(as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). See `.env.example`.
**Only the anon key ships in the app — never the service_role key.**

## Auto-update & releases

The app auto-updates from **GitHub Releases** (`buildwithatc-source/ATC-APP`) via
`electron-updater`. On launch (packaged builds only) it checks for a newer release,
downloads it in the background, and prompts **Restart to update**. **Settings → Application**
shows the version, a **Check for updates** button, and live progress.

### One-time GitHub setup

1. Push this project to `https://github.com/buildwithatc-source/ATC-APP`.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL` — your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/publishable key

   These feed the build; the workflow writes them into `.env` at build time. (The built-in
   `GITHUB_TOKEN` handles the release upload — no secret needed for it.)

### Cutting a release

```bash
npm version patch      # bumps package.json + creates a git tag (v0.1.1)
git push --follow-tags # pushes the commit AND the tag
```

Pushing a `v*` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml),
which builds on Windows + macOS and publishes the installers (and the `latest.yml` /
`latest-mac.yml` update manifests) to a GitHub Release. Installed apps pick up the update on
their next launch.

> Use `npm version minor` / `major` for larger bumps. The tag's version must match
> `package.json` — `npm version` keeps them in sync automatically.

### Code signing (currently unsigned)

Builds are **not code-signed**, so:

- **Windows:** SmartScreen may warn "Windows protected your PC" on first run — users click
  **More info → Run anyway**. To remove this, add an EV/OV code-signing certificate and set
  `CSC_LINK` + `CSC_KEY_PASSWORD` (or configure `win.certificateFile`) in the release workflow.
- **macOS:** Gatekeeper will block the app ("cannot be opened") — users right-click → **Open**,
  or you sign + notarize by adding an Apple Developer ID cert (`CSC_LINK`, `CSC_KEY_PASSWORD`)
  and notarization credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).

Add certificates as GitHub secrets and reference them in `release.yml` when you're ready.

### App icons

Installers currently use the default Electron icon. Drop a 256×256 `build/icon.ico` (Windows)
and `build/icon.icns` (macOS) and uncomment the `icon:` lines in `electron-builder.yml`.

## Roadmap (build phases)

1. ✅ Scaffold — Electron + Vite + React + TS + Tailwind, secure preload bridge, builder config
2. ✅ Auth — Supabase login, encrypted session persistence, route guarding, logout
3. ✅ Schema + Clients — SQL migration, clients CRUD
4. ✅ Invoice editor — form + line items + live template preview + numbering
5. ✅ PDF / Print — pixel-faithful A4 export via `printToPDF`
6. ✅ Dashboard + statuses — list, search/filter, status transitions, totals
7. ✅ Auto-update + release pipeline — electron-updater, GitHub Actions, release docs

_(Supabase setup, creating the first user, and release instructions are documented in the
phases that introduce them.)_
