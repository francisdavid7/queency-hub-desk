# Queency HubDesk

**Offline-first receipt management for a tech hub's front desk, with a web dashboard for the owner.**

Queency HubDesk replaces handwritten receipts at a technology academy and printing/service centre. Cashiers record customers, services, payments and print receipts on an installable desktop-style app (PWA) that keeps working without internet. Every sale syncs to the cloud, where the owner can watch revenue, review cashier activity and pull reports from any browser.

---

## What's included

**Till (cashier app — installable PWA)**

- Customers: search, create, edit, remove (soft delete, history kept)
- Services catalog with categories, plus one-off manual items on a receipt
- 5-step receipt wizard: customer → services → review (discount, notes) → payment → print
- Payments: cash / transfer / POS / other, part-payments and later top-ups, full payment history per receipt
- Sequential receipt numbers per till (`QFLC-T1-000123`)
- Printing on 80mm or 58mm thermal rolls, or A4
- Transaction history, receipts list, local dashboard and reports
- Works offline: sign in, sell, print — everything syncs when the connection returns
- Sign-in per cashier (works offline after the first online sign-in); every receipt and payment is attributed
- Voids need an admin's password at the till ("manager override", online) and a reason; receipts are never deleted
- Sync status in the title bar, JSON backup download, keyboard shortcuts (F2 new receipt, Ctrl+K search, F8 sync)

**Admin dashboard (`/admin`, any browser)**

- Overview: money collected, sales, outstanding balances, discounts and voids, daily chart, payment mix, top services
- Transactions with search and filters (period, status, cashier, method), receipt detail, web void, CSV export
- Cashier activity: receipts, sales, collections, discounts given, voids, last activity
- Reports by day, category and service
- Services & prices (changes reach the till on next sync)
- Users & tills: add staff, reset passwords, deactivate, revoke a lost till
- Audit log of sign-ins, voids, price and account changes
- Business details printed on receipts

---

## Architecture

```
 Front-desk PC (Edge/Chrome, installed PWA)          Vercel + Supabase
┌──────────────────────────────────────────┐ HTTPS ┌──────────────────────────────┐
│ Next.js till pages (static, cached by    │ sync  │ Next.js app                  │
│ the service worker → open offline)       │──────►│  /api/auth/till-login        │
│ Dexie / IndexedDB = source of truth      │◄──────│  /api/sync/push, /pull       │
│ Outbox: records marked syncStatus=pending│       │  /admin  (server components) │
└──────────────────────────────────────────┘       │ Prisma 7 → Postgres          │
                                                   └──────────────────────────────┘
```

- One Next.js 16 codebase serves both the till pages and the admin dashboard.
- The till writes locally first (`lib/actions/*`), then `lib/sync/client.ts` pushes pending records and pulls server changes in the background (on start, every minute, after edits, and when the network returns).
- The server (`lib/sync/server.ts`) recomputes every total, accepts voids only from admins, and treats receipts and payments as append-only. Customers and services use last-write-wins.
- Pull cursors (`serverUpdatedAt|id`) make a wiped or new till restore full history from the cloud.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/base-ui, Dexie 4, Prisma 7 + `@prisma/adapter-pg`, PostgreSQL (Supabase), zod, Vitest.

---

## Getting started (development)

Requirements: Node 20+, pnpm.

```bash
pnpm install                 # also runs `prisma generate`
cp .env.example .env         # fill in database URLs
pnpm db:migrate              # apply migrations
pnpm user:create --username admin --name "Your Name" --role ADMIN
pnpm dev
```

- Till: <http://localhost:3000> — sign in with the admin account first to register the browser as a till.
- Admin: <http://localhost:3000/admin>

No Postgres handy? `npx prisma dev --detach` starts a local one and prints a `postgres://…` URL to use for both `DATABASE_URL` and `DIRECT_URL` (set `DATABASE_POOL_MAX=1` with it).

The service worker only registers in production builds (`pnpm build && pnpm start`).

### Tests

```bash
pnpm test                                  # unit tests (in-memory IndexedDB)
TEST_DATABASE_URL=postgres://… pnpm test   # + integration tests against a real Postgres
pnpm lint && pnpm typecheck
```

Integration tests **truncate every table** in the target database — point them at a throwaway database only.

---

## Deploying (Vercel + Supabase)

1. **Database (Supabase).** Use the project's pooler connection strings:
   - `DATABASE_URL` — transaction pooler (port 6543), used by the app at runtime
   - `DIRECT_URL` — session pooler (port 5432), used for migrations
2. **Apply migrations** from your machine: `pnpm db:migrate`. The migration enables Row Level Security on every table so Supabase's public Data API can't read them (Prisma connects as the owner and is unaffected).
3. **Create the owner's account:** `pnpm user:create --username <name> --name "<Full name>" --role ADMIN`.
4. **Vercel.** Import the repo, set `DATABASE_URL` (and optionally `DATABASE_POOL_MAX`) in Project → Settings → Environment Variables, deploy. The build runs `prisma generate` automatically.
5. Open `https://<your-domain>/admin`, sign in, and fill in **Settings** (business name, address, phone, receipt footer).

> The existing migrations assume an empty database. The app stored data only in the browser before this release, so the server tables have no rows to migrate.

---

## Setting up the till (front-desk PC)

1. Open `https://<your-domain>` in **Microsoft Edge** (or Chrome).
2. Sign in **as an admin** — this registers the PC as a till (it appears under Admin → Users & tills).
3. Install it: **Settings → Install HubDesk**, or the install icon in the address bar. It gets its own window, taskbar icon and Start-menu entry.
4. In **Settings → Receipt printer** choose 80mm, 58mm or A4.
5. Lock the till (icon next to your name) and let each cashier sign in once while online. After that they can sign in offline too.

Existing receipts on the PC are kept: the first time the new version opens, local data is upgraded in place and uploaded on the first sync.

### One-click printing (optional)

Browsers always show a print dialog. To print straight to the default printer:

1. Set the receipt printer as the Windows default printer.
2. Right-click the HubDesk shortcut → **Properties**, and add `--kiosk-printing` to the end of **Target** (after the existing arguments).
3. Close every Edge window and reopen HubDesk from that shortcut.

In the first print dialog (before enabling this) set **Margins: None** and untick **Headers and footers** — Edge remembers these.

### Start with Windows (optional)

Edge → `edge://apps` → HubDesk → **Auto-start on device login**.

---

## Data safety & recovery

- **Cloud copy:** every receipt syncs to Postgres. Supabase takes daily backups (enable Point-in-Time Recovery on paid plans for finer restores).
- **Till wiped or replaced:** install on the new PC, sign in as admin — history downloads automatically. The new PC gets a new till code (e.g. `T2`) so receipt numbers never collide. Revoke the old till under Users & tills.
- **Offline for a long time:** data stays in the browser; the app asks the browser to keep storage persistent. **Settings → Download backup** saves a JSON copy as a last resort.
- **Rejected records:** if the server refuses a record (e.g. tampered totals), the title-bar icon turns red; details are in Settings, and the event is in the audit log.

---

## Security model

- Passwords hashed with scrypt; 5 failed sign-ins lock that username for 15 minutes.
- Admin web: httpOnly, SameSite cookie sessions (12h), tokens stored hashed; every admin page and action re-checks the role.
- Tills: registered only by an admin; sync uses a per-till bearer token stored hashed and revocable. A revoked till locks itself on its next sync.
- Offline till sign-in uses a PBKDF2 verifier cached on that PC for users who have signed in there before; deactivating a user takes effect on the till's next sync or online sign-in.
- Server-side validation of every synced record (zod schemas + recomputed totals). Receipts are immutable once stored; payments are append-only, locked per receipt, and refused on voided or fully paid receipts. A till can only use its own receipt-number prefix, and records dated in the future are held back until the PC clock is fixed.
- Voids are never accepted over sync (sync proves which till is talking, not who is standing at it). They happen on the admin web, or at the till when an admin re-enters their password, which the server verifies.
- Audit log for sign-ins, failures, voids, price changes, user and till changes.
- Security headers (HSTS, frame-deny, nosniff, referrer policy); the service worker never caches `/admin` or `/api`.
- Known limits: cashier attribution on a till is only as strong as the shared PC (anyone using it as a signed-in cashier acts as that cashier); there is no app-wide Content-Security-Policy yet; sign-in lockout is per username (5) and per IP (25) per 15 minutes, so a stranger can temporarily lock an account by guessing.

---

## Project structure

```
app/(app)/            Till pages (client components, work offline)
app/admin/            Admin dashboard (server components) and CSV export
app/api/              Till sign-in and sync endpoints
app/sw.js/route.ts    Service worker (versioned per build)
components/           UI (reciept/ = till receipt flow, admin/ = dashboard widgets)
db/db.ts              Dexie schema and upgrades
lib/actions/          Local (till) write operations
lib/sync/             Sync contract, client engine, server handlers
lib/auth/             Passwords, sessions, till auth
lib/admin/            Dashboard queries and server actions
prisma/               Schema and migrations
scripts/create-user.ts
tests/                Unit tests; tests/integration needs TEST_DATABASE_URL
```

---

## Roadmap

- Job & order tracking (pending → in progress → ready → collected)
- Quotations and invoices that convert into receipts
- Academy management: course registration and training payments
- SMS / WhatsApp receipt delivery
- End-of-day cash reconciliation (expected vs counted cash per cashier)

---

## License

Internal/private project for Queency Hub.
