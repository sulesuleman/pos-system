# Epic 1 Context: Mart onboarding and platform foundation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on. A seeded Super Admin registers a Mart and its Owner without any deployment. The Owner activates the account, logs in, and sets up Branches and Mart settings. Every Mart's data is isolated from every other Mart's, and every change is audited. The epic also sets up the scaffold, the CI pipeline, the central tenant filter with its two-Mart isolation test, and hosting with hourly backups and a rehearsed restore. Platform basics come first because every other record belongs to a Mart and a Branch. Registered Devices are not enforced until Epic 2, so in this epic the Owner can use any browser.

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

- **Super Admin:** accounts are created only by a database seed script (email plus hashed password). No UI or API path may create one. The Super Admin's Mart list shows Mart name, Mart code and status only. The Super Admin API never exposes sales, stock, staff activity or a Mart's Audit Log. Every Super Admin action (sign-in and sign-out, create Mart, suspend, reactivate) goes to a **platform audit log**, which is separate from each Mart's Audit Log.
- **Creating a Mart** needs a Mart name, an Owner name and an Owner contact, and saving is blocked if any is missing. Creating a Mart produces:
  - a unique 6-character Mart code (letters and digits, never 0, O, 1 or I)
  - an Owner account with a numeric Staff ID that is unique within the Mart (for example 1001)
  - a one-time setup code, shown once, that works once and expires
- **One Owner per Mart.** The Owner holds every Permission and is not an editable Role.
- **Owner login:** the Owner logs in with Mart code, Staff ID and password. The session carries the Mart context, which is checked on every request. Wrong credentials get a generic message. Used or expired setup codes are refused with a clear message.
- **Audit Log:**
  - Each entry records who, what changed (old and new values), when (UTC) and from which device or browser.
  - The entry is written in the same transaction as the change.
  - The app has no path to edit or delete an entry.
  - The Owner can filter by date range, user and kind of change. Results show newest first and come only from the Owner's own Mart.
  - Viewing can later be delegated through the view Audit Log Permission.
- **Branches:**
  - Only the Owner can create or deactivate a Branch. A user with the manage Branches and devices Permission who is assigned to a Branch can edit its settings.
  - Branch settings are name, IANA time zone (default Asia/Karachi), cutover date (used later by opening stock) and the local time of the nightly stock balance check (default 03:00).
  - A deactivated Branch cannot sell, and its history stays visible to the Owner.
  - Every Branch and Mart setting change is audited.
- **Mart settings:** currency (default PKR, whole units), default time zone, and the long-pending Return threshold (default 30 minutes).
- **Suspension:** on next contact, every login and API request for a suspended Mart is refused with a "Mart suspended" message. One exception: Counter uploads of unsynced data are still accepted. Reactivating restores logins and loses or changes no data. Other Marts are unaffected. Counter lock and resync behavior belongs to Epic 7.
- **Onboarding without deployment:** new Marts and Branches are added in the app only.
- **Durability:** automatic backups run at least hourly with point-in-time recovery. Retention is at least 7 days, which is an assumption. A restore is rehearsed into a separate environment, the steps are written down, and the rehearsal is repeated before pilot go-live.
- **Security:** passwords are hashed and HTTPS is used everywhere. Secrets (database credentials and signing keys) stay outside the repository.
- **Cost:** a small monthly hosting cost is acceptable.
- **Language:** the UI is English only.

## Technical Decisions

- **Binding stack:**
  - backend: .NET 10 LTS, EF Core 10 via Microting.EntityFrameworkCore.MySql 10.0.3, MySQL 8.4 LTS
  - frontend: React + Vite + MUI 9.1.x
  - Exact React and Vite versions must be verified as current stable and recorded in the architecture spine's Stack table.
- **Modular monolith:** one deployable, with modules tenancy, identity, catalog, sales, stock, returns and reporting. Epic 1 work lives mainly in the tenancy module (Marts, Branches, Super Admin) and the identity module. Backend code organization (vertical slices, layered or Clean, and whether to use CQRS/MediatR) is undecided. Story 1.1 chooses it and records it as a new AD in the spine.
- **Frontend shape:** one codebase with separate Counter and Manager/Owner entry points. It is a client-routed SPA with no SSR. Only the Counter entry may later be wrapped in Electron.
- **Versioned API:** every API and sync payload is versioned, and routes are versioned too (for example `/api/v1/health`).
- **Tenancy:**
  - All Marts share one database and one schema. Every tenant-owned table has `MartId`, plus `BranchId` where the data is branch-scoped.
  - Isolation comes only from EF Core global query filters. There are no unfiltered or hand-written queries that bypass them.
  - An automated two-Mart isolation test runs in CI and fails the build on any cross-Mart read or write. It must be extended to cover every new tenant table, including Branches.
  - MySQL has no row-level security, so the app layer is the only barrier.
- **Hierarchy:** Mart > Branch > Counter. Currency and settings are per Mart. There is no billing; Marts are switched on and off by hand.
- **Identity:** every account belongs to exactly one Mart. There is no global person, membership or SSO.
- **Time:** every timestamp is stored in UTC. Each Branch has an IANA time zone and the Mart has a default zone. Day boundaries are computed in the zone that applies, never in the server's local time.
- **CI** builds the backend and frontend, applies migrations to a throwaway MySQL 8.4, and runs the backend and frontend tests. When main is green, CI deploys to staging. Production deploys are a manual, logged step that applies migrations first.
- **Decisions this epic must make and record as ADs in the spine:**
  - backend code organization (Story 1.1)
  - Audit Log immutability mechanism, for example an append-only table with no update or delete path (Story 1.5)
  - hosting platform, which must support MySQL 8.4 with point-in-time recovery at low cost (Story 1.8)
- **Must not assume** anything about the device token lifecycle, the background job mechanism, or push versus polling. Later epics decide these.
- **Naming:** use the glossary terms Mart, Branch, Counter, Registered Device, Stock Event, Sync and so on in code.

## UX & Interaction Patterns

- There is no UX design document, so each story decides its own screen layout.
- Screens are responsive by width.
- Epic 1 has three areas: the Super Admin area (sign-in, Marts list and create, suspend and reactivate), Owner activation and login, and Owner screens (Audit Log, Branches, Mart settings).
- One-time codes are shown once.
- Authentication failures use generic messages.

## Cross-Story Dependencies

- **Order within the epic:**
  - Story 1.1 comes first.
  - Story 1.2 is needed before 1.3 and 1.7, because they need a signed-in Super Admin and the platform audit log.
  - Story 1.3 creates the tenant filter and the isolation test that every later tenant table relies on.
  - Story 1.4 depends on 1.3. It logs failed logins only to the platform log, because the Mart Audit Log does not exist until Story 1.5.
  - Story 1.6 audits its changes, so it needs 1.5.
  - Story 1.8 builds on the CI from 1.1.
- **Later epics:**
  - Epic 2 adds Roles, staff, the Branch's first-device setup code, Registered Device enforcement, and Owner recovery through the Super Admin, which writes to both the platform log and the Mart log.
  - Epic 6 uses a Branch's cutover date and stock check time.
  - Epic 7 implements Counter behavior for a suspended Mart and the restore-epoch re-send that relies on the hourly backups.
  - Epic 10 uses the per-Branch time zones and the long-pending Return threshold.
