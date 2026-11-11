# Epic 1 Context: Mart onboarding and platform foundation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on. A seeded Super Admin registers a Mart and its Owner without any deployment or code change. The Owner activates the account, logs in, and sets up Branches and Mart settings. Every Mart's data is isolated from every other Mart's, and every change is audited. The epic also sets up the project scaffold, the CI pipeline, the central tenant filter with its two-Mart isolation test, and hosting with hourly backups and a rehearsed restore. Platform basics come first because every other record in the system belongs to a Mart and a Branch. Registered Device enforcement is not in scope until Epic 2, so in this epic the Owner may act from any browser.

## Stories

- Story 1.1: Project scaffold and build pipeline
- Story 1.2: Super Admin sign-in
- Story 1.3: Register a Mart and its Owner, with tenant isolation
- Story 1.4: Owner activation and login
- Story 1.5: Mart Audit Log
- Story 1.6: Manage Branches
- Story 1.7: Suspend and reactivate a Mart
- Story 1.8: Hosting, deployment and backups

## Requirements & Constraints

- **Super Admin:** accounts exist only via a database seed script (email plus hashed password); no UI or API path may create one. The Super Admin's Mart list shows Mart name, Mart code and status only — the Super Admin API never exposes a Mart's sales, stock, staff activity or Audit Log. Every Super Admin action (sign-in/out, create Mart, suspend, reactivate) goes to a **platform audit log**, kept separate from each Mart's own Audit Log.
- **Creating a Mart** needs a Mart name, an Owner name and an Owner contact; saving is blocked if any is missing. It produces: a unique 6-character Mart code (letters and digits, never 0, O, 1 or I), an Owner account with a Mart-unique numeric Staff ID, and a one-time setup code shown once, usable once, with an expiry.
- **One Owner per Mart,** holding every Permission; the Owner's Role can never be edited down.
- **Owner login:** Mart code + Staff ID + password; the session carries the Mart context, checked on every request. Wrong credentials get a generic refusal message; used or expired setup codes are refused with a clear message. Failed login attempts go to the platform log (Story 1.2) until the Mart Audit Log exists (Story 1.5).
- **Audit Log:** each entry records who, what changed (old and new values), when (UTC) and from which device or browser, written in the same transaction as the change it records. No app path may edit or delete an entry. The Owner filters by date range, user and kind of change; results are newest first and scoped to the Owner's own Mart. Viewing can later be delegated via the view Audit Log Permission.
- **Branches:** only the Owner creates or deactivates a Branch; a user holding manage Branches and devices for that Branch may edit its settings. Settings are name, IANA time zone (default Asia/Karachi), cutover date (used later by opening stock, Epic 6) and the local time of the nightly stock balance check (default 03:00, Epic 6). A deactivated Branch cannot sell but its history stays visible to the Owner. Every Branch and Mart setting change is audited.
- **Mart settings:** currency (default PKR, whole units), default time zone, and the long-pending Return threshold (default 30 minutes, used by Epic 10's Exceptions Report).
- **Suspension:** on next contact, every login and API request for a suspended Mart is refused with a "Mart suspended" message, except Counter uploads of unsynced data, which are still accepted. Reactivation restores logins with no data lost or changed. Other Marts are unaffected. Counter-side lock/resync behavior for a suspended Mart belongs to Epic 7.
- **Onboarding without deployment:** new Marts and Branches are added entirely in-app.
- **Durability:** automatic backups run at least hourly with point-in-time recovery; retention is at least 7 days `[ASSUMPTION]`. A restore is rehearsed into a separate environment with written-down steps, repeated before pilot go-live.
- **Security:** hashed passwords, HTTPS everywhere, secrets (DB credentials, signing keys) kept outside the repository.
- **Cost:** a small monthly hosting cost is acceptable.
- **Language:** English-only UI.

## Technical Decisions

- **Binding stack (current, supersedes any MySQL references elsewhere):** .NET 10 LTS backend, EF Core 10 via `Microsoft.EntityFrameworkCore.SqlServer` against **SQL Server** (not MySQL — the earlier MySQL 8.4 LTS decision was superseded 2026-11-10 because a SQL Server instance, managed via SSMS, was already available locally and Docker/WSL2 for MySQL was not set up). Local dev and CI both target SQL Server; the hosting choice (Story 1.8) must support SQL Server backups/PITR, not MySQL's. Production SQL Server version is not yet pinned (local dev uses SQL Server 2025 Developer Edition); frontend is React + Vite + MUI 9.1.x, with exact React/Vite versions to be verified as current stable and recorded in the spine's Stack table.
- **Modular monolith:** one deployable with modules tenancy, identity, catalog, sales, stock, returns, reporting. Epic 1 work lives mainly in the tenancy and identity modules. Backend code organization is already decided: **vertical slices, no MediatR/CQRS** — each feature (e.g. "Create Mart") owns a folder with its endpoint, request/response types, validation and DB query together; no shared generic Service layer. The module boundary stays at the module level; slices live inside each module. (Story 1.1 records this as an AD if not already reflected in the spine it reads from.)
- **Frontend shape:** one codebase, separate Counter and Manager/Owner entry points; client-routed SPA, no SSR. Only the Counter entry may later be wrapped in Electron.
- **Versioned API:** every API and sync payload is versioned; routes are versioned too (e.g. `/api/v1/health`).
- **Tenancy:** all Marts share one database and schema. Every tenant-owned table carries `MartId`, plus `BranchId` where branch-scoped. Isolation comes only from EF Core global query filters — no hand-written unfiltered queries. An automated two-Mart isolation test runs in CI and fails the build on any cross-Mart read or write; it must cover every new tenant table, including Branches. SQL Server does support native Row-Level Security, but it is deliberately not used, to keep enforcement in one layer (the ORM) rather than split across database and app.
- **Hierarchy:** Mart > Branch > Counter. Currency and settings are per Mart. No billing; Marts are switched on and off by hand. No stock transfers between Branches.
- **Identity:** every account belongs to exactly one Mart; no global person, membership or SSO.
- **Time:** every timestamp stored in UTC; each Branch has an IANA time zone, the Mart has a default zone; day boundaries are computed in the zone that applies, never server local time.
- **CI:** builds backend and frontend, applies migrations to a throwaway SQL Server instance, runs backend and frontend tests. Green main deploys to staging; production deploys are a manual, logged step that applies migrations first.
- **Decisions this epic must still make and record as ADs in the spine:**
  - Audit Log immutability mechanism, e.g. an append-only table with no update/delete path (Story 1.5) — still undecided.
  - Hosting platform, which must support SQL Server with point-in-time recovery at low cost (Story 1.8) — still undecided.
- **Must not assume** anything about the device token lifecycle, the background job mechanism, or push versus polling — later epics decide these.
- **Naming:** use the glossary terms (Mart, Branch, Counter, Registered Device, Stock Event, Sync, etc.) in code.

## UX & Interaction Patterns

- No UX design document exists; each story decides its own screen layout. Screens are responsive by width.
- Epic 1 spans three areas: the Super Admin area (sign-in, Marts list and create/suspend/reactivate), Owner activation and login, and Owner screens (Audit Log, Branches, Mart settings).
- One-time codes are shown once. Authentication failures use generic messages.

## Cross-Story Dependencies

- **Order within the epic:** Story 1.1 comes first. Story 1.2 (Super Admin sign-in and platform log) is needed before 1.3 and 1.7. Story 1.3 creates the tenant filter and isolation test every later tenant table relies on. Story 1.4 depends on 1.3 and logs failures only to the platform log until 1.5 exists. Story 1.6 needs 1.5 to audit its changes. Story 1.8 builds on the CI pipeline from 1.1.
- **Later epics depend on this one:** Epic 2 adds Roles, staff, the Branch's first-device setup code, Registered Device enforcement, and Owner recovery through the Super Admin (writing to both the platform log and the Mart log). Epic 6 uses a Branch's cutover date and stock-check time. Epic 7 implements Counter behavior for a suspended Mart and the restore-epoch re-send that relies on the hourly backups set up here. Epic 10 uses the per-Branch time zones and the long-pending Return threshold.
