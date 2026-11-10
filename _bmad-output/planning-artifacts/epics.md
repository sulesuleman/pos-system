---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-POS-System-2026-10-06/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-POS-System-2026-10-06/ARCHITECTURE-SPINE.md
---

# POS-System - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for POS-System, decomposing the requirements from the PRD and the Architecture spine into implementable stories. There is no UX design document; stories carry functional acceptance criteria, and the PRD user journeys (UJ-1 to UJ-5) guide flows. FR and NFR numbers are the PRD's stable IDs (not sequential).

## Requirements Inventory

### Functional Requirements

- **FR-1 Accounts, Roles and Permissions:** Owner creates staff accounts (name, optional phone, Branch, Role), disables them, defines Roles from a fixed Permission list (sell, request Return, approve Return, manage Products, manage Deliveries, manage suppliers, run Spot Counts, close Shifts, view dashboard, view Exceptions Report, view Audit Log, manage staff and Roles, reset PINs, manage Branches and devices), assigns a Role per Branch. Starter Roles: Cashier (sell, request Return), Manager (everything except view dashboard). Roles can only be granted by someone holding their Permissions; nobody edits their own Role. A Permission acts on Mart-wide data only if held in every active Branch. Non-Owners create, disable and reassign only staff in lower Roles. Server rejects actions outside the Role; nobody approves their own Return; Owner holds every Permission and cannot be edited down; disabled accounts refused online, and offline only until next Sync or the 72-hour limit; accounts never cross Marts; all changes audited.
- **FR-27 Staff login, activation and PIN reset:** creating staff generates a Staff ID and a one-time activation code; staff set their own PIN/password at first login. Login = Mart + Staff ID + PIN (Counter knows the Mart; phone asks for Mart code). Formats: Mart code 6 chars without look-alikes, numeric Staff ID, 8-digit activation code (single use, 7 days), PIN at least 6 digits. Owner resets anyone; reset-PINs Permission resets only lower Roles; old PIN dies at once; resets audited.
- **FR-2 Registered Devices:** Owner registers and revokes devices per Branch; server checks device on every login and write. Selling users refused on unregistered or other-Branch devices; unregistered devices are read-only; revocation kills sessions on next contact; Owner can revoke a lost Counter from another Registered Device; audited. No registering home PCs or phones.
- **FR-3 Offline login at Counters:** login and Return approval work offline. Credentials cached as slow hashes only; only accounts active at last Sync and assigned to the Branch; cached credentials, device token and unsynced Sales encrypted at rest; catalog not encrypted. 5 wrong PINs lock that Staff ID on that Counter for 5 minutes, doubling on repeat, online and offline; failures and locks logged and reported.
- **FR-22 Device provisioning and recovery:** one-time setup code registers a new Branch's first device; further devices via a one-time code from a Registered Device, used within 10 minutes, server then issues a secret token; password alone never registers a device; offline recovery code registers a device if all are lost; replacement PC registered from another device and the dead one revoked; replacement Counter downloads the catalog from the cloud only; Owner who lost password and recovery code is re-issued a one-time Owner activation code by the Super Admin after an identity check outside the system (no data access, audited in platform and Mart logs, Owner notified).
- **FR-4 Build a cart by scanning:** scanning adds Units; scanning again increases quantity; cart shows name, price, quantity, line total and total in Mart currency; Cashier can change quantity or remove a line; no price change, discounts or held carts.
- **FR-5 Manual Barcode entry:** typed Barcode plus quantity adds the same line as a scan, for any Barcode kind; each typed entry recorded per Cashier and Counter for the Exceptions Report; unknown Barcode shows "not found" and adds nothing. No free-text or weighed items.
- **FR-6 Complete a Sale with payment:** cash or card (recorded only); Sale records Cashier, Counter, Branch, time, lines, total, payment type and one Stock Event per line; completes even if stock goes negative; cannot be edited (corrections via Return).
- **FR-7 Sales Receipt printing:** thermal receipt with Mart name, Branch name, date/time, Cashier, lines, total, payment type, unique receipt number; reprint of last receipt with the same number; printer failure does not lose the Sale.
- **FR-23 Receipt numbering:** per-Counter code plus running count (e.g. C1-000123), created offline, unique within the Mart; replacement Counter takes over the code and continues from the last number the cloud saw plus a safe gap of 10,000.
- **FR-8 Request a Return:** Cashier scans or types Units, picks refund method, optionally suggests restock/damaged. Refund amount = the Counter's current selling price at request, never typed. Pending Return changes nothing. Records Cashier, Counter, Branch, time; counted per Cashier. Cashier can cancel own pending request and keep selling. No matching to the original Sale, no return window.
- **FR-24 Approve or reject a Return:** Approver sees pending Returns at the Counter (own credentials) or on a Registered Device; accepting deducts the amount from Sales totals and (restock only) adds Units via a Stock Event; damaged adds nothing; rejecting records a reason and changes nothing; decisions audited and counted per Approver; no self-approval; works offline with cached login and takes effect on Sync; approval by an account disabled before upload is still accepted and flagged; refund handed over only after acceptance; cash refunds count in the Shift open at acceptance; closed Shifts never recomputed. Approvers without sell get a limited Counter session. A Return decided both at the Counter and elsewhere: the Counter decision wins, the other is flagged.
- **FR-9 Manage Products:** create, edit, deactivate Products (name, Barcodes, selling price, Conversion) and set a per-Branch price override. Reorder level per Branch (default none). Non-price edits reach online Counters within seconds, offline ones on Sync. New prices are saved at once but apply at Counters only at the next Shift boundary; pending price changes visible. Edits audited with old and new values. Purchase prices visible only to Product/Delivery managers on Registered Devices, never Cashiers.
- **FR-10 Bulk import of Products:** CSV import; invalid rows listed with reasons, valid rows imported; a row whose Barcode belongs to another Product is invalid; several Barcodes per row including pack Barcodes; 500,000 rows import in the background with progress within NFR-10.
- **FR-28 Barcodes, generic Products and in-store codes:** many Barcodes per Product, each Barcode in exactly one Product per Mart; specific items by default; generic Products link several brands' Barcodes at one price, with stock and reports per generic Product; pack Barcodes mean a set number of Units; in-store EAN-13 codes (prefix 20–29) generated for unlabeled items and printable as labels or a code list; moving a Barcode is audited and stock stays with the old Product until a Spot Count; Barcode changes sync like non-price edits.
- **FR-11 Enter a Delivery:** choose an active supplier; lines of Product, quantity in Cartons/Packs/Units and purchase price; Unit quantity shown before confirming via Conversion; one Stock Event per line; Product without Conversion blocked; per-line Conversion override recorded; sealed Cartons at label quantity or counted quantity with difference recorded; purchase price kept per Delivery; audited.
- **FR-12 Correct a Delivery:** a correction is a new Stock Event referencing the original, which is never deleted; both audited.
- **FR-21 Manage suppliers:** create, edit, deactivate Mart-wide suppliers (name, contact); a Delivery needs an active supplier; audited. No payments, purchase orders or balances.
- **FR-13 Spot Count:** pick a Product or a shelf's Products, enter counted Units, see the difference; confirming creates a correcting Stock Event; audited with system qty, counted qty and user; differences in the Exceptions Report.
- **FR-14 Opening stock count:** Owner or Spot Count user enters opening stock per Branch at cutover as Stock Events dated at cutover; typed on screen or imported from CSV (Barcode, Units) in the background, invalid rows listed, audited; one full physical count per Branch before go-live (assumption).
- **FR-15 Offline selling:** Sales, Return requests, approvals and Shift close work offline after a first Sync; online/offline/syncing indicator; up to 72 hours since the last successful Sync, measured as elapsed time (clock changes don't extend it); countdown and warning under 24 hours; at the limit a Sale in progress finishes, then no new logins or Sales until Sync; unsynced data never deleted.
- **FR-16 Sync:** safe retries with no lost or duplicated Sales; concurrent offline Sales on two Counters both count; online Sales up and non-price edits down within seconds (5 s assumption); automatic queue and resync; prices applied only at a Shift boundary, Sale keeps the price used; first catalog download for 500,000 Products paged, compressed, resumable, and required before selling; then delta only; stock quantities never sent to Counters; local copy kept 48 hours after acknowledgement; Sync failure visible and last Sync time per Counter shown to the Owner; rejected events parked, flagged, never deleted, later events continue; parked events view-only (fixed via normal correcting records); uploads from revoked devices or deactivated Branches accepted and flagged if before the revoke, otherwise parked, and the device stays revoked; after a cloud restore every Counter re-sends all it holds and repeats are ignored; warning for unsynced Sales older than 1 hour and unsynced count per Counter for the Owner.
- **FR-17 Close a Shift:** at most one open Shift per Counter; Cashier opens with a cash float and closes with counted cash; expected cash = float + cash Sales − accepted cash refunds; a close-Shifts user can close a Shift left open, attributed to them; non-zero difference in the Exceptions Report; each Cashier's daily Sales total available to the Owner.
- **FR-18 Sales dashboard:** today and a date range for the user's Branches; Owner sees all Branches and can filter; totals, by Cashier, by payment type, accepted Returns reduce totals; low stock (at or below reorder level) and negative stock lists; searchable stock level for every Product (stock lists and search also open to view Exceptions Report); phone-width, no editing controls; online Sales visible within 5 s; last Sync time shown.
- **FR-19 Exceptions Report:** negative stock; Spot Count differences; damaged Returns; Returns per Cashier and per Approver (accepted/rejected/pending); long-pending Returns (30 min default, per-Mart setting); typed-in Barcodes per Cashier; Shift cash differences; parked events and Sales accepted from revoked devices or deactivated Branches; PIN lockouts; stock balance mismatches from the scheduled check; each item links to its records.
- **FR-20 Audit Log:** records every stock, price, Product, user, Role, Return decision and device change with who, old and new values, when and which device; cannot be edited or deleted through the app; Owner can view and search it and delegate via Permission.
- **FR-25 Register and manage Marts:** Super Admin (seeded in DB) creates a Mart with Owner name and contact and a one-time setup code; Owner sets a password with it; suspend and reactivate; suspension blocks logins on next contact; an online Counter uploads its unsynced data, then locks; offline Counters lock at the latest at the 72-hour limit, keeping unsynced data; after reactivation each Counter must Sync before selling; Super Admin sees Mart name and status only; Super Admin actions in a platform audit log. No billing.
- **FR-26 Manage Branches:** Owner creates, edits, deactivates Branches and assigns staff; every Stock Event, Sale, Return, Delivery, Shift and device belongs to one Branch; users see only their Branches, Owner sees all; no shared stock or transfers; deactivated Branch cannot sell but history stays; audited.

### NonFunctional Requirements

- **NFR-1 Availability at the Counter:** as defined in FR-15 (Counter never stops selling within the 72-hour window).
- **NFR-2 Data durability:** automatic cloud backups at least hourly (point-in-time recovery); restore tested before go-live; Counters re-send held events after a restore.
- **NFR-3 Security:** hashed passwords; HTTPS everywhere; server enforces Permission, Branch assignment and Registered Device on every request; Counter local data limited to what offline selling needs; encryption at rest per FR-3.
- **NFR-4 Device targets:** desktop browser on Counter and server-room PC, Counter installed as a web app; USB keyboard-wedge scanner and ESC/POS thermal printer; phone dashboard in a current mobile browser; hardware models unconfirmed.
- **NFR-5 Language, currency and tax:** English UI (Product names may be Urdu text); currency per Mart, PKR whole rupees for the pilot; no tax handling.
- **NFR-6 Tenant isolation:** one deployment serves many Marts; every record belongs to one Mart (and Branch where relevant); no cross-Mart reads or writes; Super Admin never reads business data; enforced on every request; tested with cross-Mart attempts.
- **NFR-7 Cost:** small monthly hosting cost acceptable.
- **NFR-8 Scale:** tens of Marts in year one, a few Branches each, 2–4 Counters per Branch, under 15 Cashiers per Branch, at least 500,000 Products per Mart, within NFR-10 targets.
- **NFR-9 Onboarding without code changes:** new Marts and Branches added in the app with no deployment.
- **NFR-10 Performance targets** (500,000 Products): scan to cart under 200 ms online or offline; name search first results under 500 ms; Sale to printed receipt under 2 s; Manager/Owner screens and reports for one day under 3 s; 500,000-row import within 30 minutes with the screen usable.
- **NFR-11 Time zone:** times stored in UTC; each Branch has a time zone (default Asia/Karachi) for "today", Shifts and daily figures; Mart-wide reports use the Mart default zone.

### Additional Requirements

From the Architecture spine (no starter template is specified; the project is greenfield):

- **Stack (binding):** .NET 10 LTS backend; EF Core 10 via Microting.EntityFrameworkCore.MySql 10.0.3; MySQL 8.4 LTS; React + Vite + MUI 9.1.x frontend (exact React/Vite versions to verify before scaffolding). Project scaffolding must be the first story.
- **Deployment shape:** one modular monolith deployable with modules tenancy, identity, catalog, sales, stock, returns, reporting; internal code organization deferred (decide when the first module starts). Hosting platform not chosen; it must support hourly point-in-time MySQL backups.
- **AD-1 Counter platform:** installable web app with IndexedDB; UI/logic reach the platform only through `CounterStore`, `ReceiptPrinter`, `CashDrawer`, `Scanner`, `Crypto` interfaces; sync engine is plain TypeScript with no browser APIs, tested against a fake store; nothing that matters in localStorage or service-worker logic; client-routed SPA; separate Counter and Manager/Owner entry points in one codebase; request persistent storage. **Gate:** spike with 500,000 Products (barcode and name search) and a real ESC/POS print must meet NFR-10 before the Counter design hardens; a miss moves to Electron + SQLite.
- **AD-2 Tenancy:** shared database and schema; every tenant table has `MartId` (and `BranchId` where branch-scoped); isolation only via EF Core global query filters, no unfiltered hand-written queries; automated two-Mart isolation test in CI.
- **AD-3 Hierarchy:** Mart > Branch > Counter; stock per Branch; Product list Mart-wide with optional Branch price; no transfers; Super Admin seeded; per-Mart currency and settings.
- **AD-4 Identity:** every account in exactly one Mart; no global person or SSO.
- **AD-5 Enforcement:** Permission, Branch and Registered Device checked server-side on every request.
- **AD-6 Stock as events:** stock changes only by appending Stock Events; quantities never sent to Counters.
- **AD-7 Sync contract:** client-generated idempotent IDs; oldest-first batched upload; delta download by version cursor including deactivations; real-time while online (push vs polling open); staged prices; 48-hour retention after ack; rejected events parked (view-only); revoked/deactivated uploads accepted-and-flagged or parked by time; restore epoch triggers full re-send; events carry Counter time and server receive time, ordering by server time; resumable paged compressed catalog download with barcode-keyed local index; every API and sync payload versioned.
- **AD-8 Returns approval** as in FR-8/FR-24.
- **AD-9 Offline credentials:** slow hashes; PIN lockout state kept in the Counter store; encryption of credentials, unsynced Sales and device token; 72-hour elapsed-time limit; revocation and suspension effective on next contact or at the limit.
- **AD-10 Stock balance:** one balance row per Product and Branch updated in the same transaction as the Stock Event insert; repeats change nothing; all stock reads use the balance; scheduled recompute reports drift to the Exceptions Report, never fixes silently; cloud only.
- **AD-11 Barcodes:** Barcode table (`MartId`, `Barcode`, `ProductId`, Units per scan) unique on (`MartId`, `Barcode`); generic Product is an ordinary Product; in-store EAN-13 codes from prefix 20–29 generated by the server; Counter index keyed by Barcode returning ProductId and Units per scan.
- **AD-12 Time:** UTC storage; IANA time zone per Branch and a Mart default; day boundaries computed in that zone.
- **Cross-cutting conventions:** PRD glossary terms used in code; every privileged action audited; Sale and Return IDs generated on the Counter.
- **Not yet decided (stories must not assume):** Audit Log immutability mechanism, device token lifecycle, background job mechanism, push vs short polling.

### UX Design Requirements

No UX design document exists (decided 2026-10-12 to proceed without one). Screen layout is decided per story. Constraints carried from the PRD: responsive by screen width; phone dashboard is read-only; Counter is keyboard and scanner driven.

### FR Coverage Map

- FR-1: Epic 2 - Accounts, Roles and Permissions
- FR-2: Epic 2 - Registered Devices
- FR-3: Epic 7 - Offline login, PIN lockout, Counter encryption
- FR-4: Epic 4 - Build a cart by scanning
- FR-5: Epic 4 - Manual Barcode entry
- FR-6: Epic 4 - Complete a Sale with payment
- FR-7: Epic 4 - Sales Receipt printing
- FR-8: Epic 9 - Request a Return
- FR-9: Epic 3 - Manage Products; Epic 5 - prices applied at Shift boundary; Epic 8 - purchase price visibility
- FR-10: Epic 3 - Bulk Product import
- FR-11: Epic 8 - Enter a Delivery
- FR-12: Epic 8 - Correct a Delivery
- FR-13: Epic 6 - Spot Count
- FR-14: Epic 6 - Opening stock count (screen and CSV)
- FR-15: Epic 7 - Offline selling limits (72 hours, lock, countdown)
- FR-16: Epic 4 (catalog download, delta, idempotent upload, real-time sync), Epic 5 (prices applied at Shift boundary), Epic 7 (parked events, revoked uploads, restore re-send, unsynced warnings)
- FR-17: Epic 5 - Open and close a Shift
- FR-18: Epic 10 - Sales dashboard
- FR-19: Epic 10 - Exceptions Report (earlier epics record the underlying data)
- FR-20: Epic 1 - Audit Log (writing and viewing)
- FR-21: Epic 8 - Manage suppliers
- FR-22: Epic 2 (device provisioning, recovery code, Owner recovery), Epic 4 (replacement Counter catalog download)
- FR-23: Epic 4 - Receipt numbering
- FR-24: Epic 9 - Approve or reject a Return
- FR-25: Epic 1 (register, suspend, reactivate Marts), Epic 7 (suspended Mart Counter lock and resync)
- FR-26: Epic 1 - Manage Branches
- FR-27: Epic 2 - Staff login, activation and PIN reset
- FR-28: Epic 3 - Barcodes, generic Products and in-store codes

## Epic List

### Epic 1: Mart onboarding and platform foundation
A Super Admin registers a Mart and its Owner; the Owner activates and sets up Branches; every Mart's data is isolated and every change is audited. Starts with project scaffolding (.NET 10, EF Core 10, MySQL 8.4, React + Vite + MUI 9), the central tenant filter (AD-2) and the two-Mart isolation test in CI.
**FRs covered:** FR-25 (register, suspend, reactivate), FR-26, FR-20, NFR-2 (hosting and backups, Story 1.8)

### Epic 2: Staff, Roles and Registered Devices
The Owner defines Roles from the fixed Permission list, creates staff who activate their own PINs, and registers or revokes devices; the server enforces Permission, Branch and device on every request; a locked-out Owner can recover via the Super Admin. Decides the device token lifecycle.
**FRs covered:** FR-1, FR-27, FR-2, FR-22 (provisioning, recovery code, Owner recovery)

### Epic 3: Product catalog and barcodes
A Manager sets up Products, Branch prices, reorder levels and the Barcode model (generic Products, pack Barcodes, in-store codes), and imports up to 500,000 Products from CSV in the background. Decides the background job mechanism.
**FRs covered:** FR-9, FR-10, FR-28

### Epic 4: Selling at the Counter
A Cashier scans (or types) Barcodes, takes cash or card, and prints a numbered Sales Receipt; Sales save on the Counter first and sync in real time. Starts with the AD-1 spike (500,000 Products in IndexedDB, real ESC/POS print, NFR-10 pass marks). Introduces Stock Events from Sales and the stock balance table (AD-10). Decides push vs short polling. New prices apply on arrival in this epic; staging to the Shift boundary comes in Epic 5.
**FRs covered:** FR-4, FR-5, FR-6, FR-7, FR-23, FR-16 (core), FR-22 (replacement Counter download)

### Epic 5: Shifts and cash control
A Cashier opens a Shift with a float and closes it with counted cash; expected cash and differences are recorded; a close-Shifts user can close an abandoned Shift; new prices take effect at Counters only at a Shift boundary.
**FRs covered:** FR-17, FR-9 and FR-16 (staged price application)

### Epic 6: Stock accuracy
A Manager loads opening stock per Branch (on screen or CSV) and runs Spot Counts that correct stock against the shelf; a scheduled check compares balances with Stock Events and reports drift. Placed early so the pilot can load opening stock.
**FRs covered:** FR-14, FR-13

### Epic 7: Offline resilience and data safety
Counters keep selling through long outages and survive revoked devices, suspended Marts and cloud restores without losing a Sale: offline login with cached PINs, PIN lockout, the 72-hour limit with countdown and lock, parked events, revoked/deactivated uploads, restore epoch re-send, unsynced-Sale warnings.
**FRs covered:** FR-3, FR-15, FR-16 (resilience), FR-25 (suspended Mart Counter behavior)

### Epic 8: Receiving Deliveries
A Manager records supplier Deliveries in Cartons, Packs or Units with purchase prices, converted to Units, and corrects Deliveries without deleting history.
**FRs covered:** FR-21, FR-11, FR-12

### Epic 9: Returns with approval
A Cashier requests a Return; an Approver accepts or rejects it at the Counter (including offline) or on a Registered Device, choosing restock or damaged; refunds count in the right Shift.
**FRs covered:** FR-8, FR-24

### Epic 10: Owner dashboard and Exceptions Report
The Owner checks sales across Branches from a phone (read-only), sees low and negative stock and searchable stock levels, and reviews every exception the earlier epics record. Applies per-Branch time zones (NFR-11) and the screen performance target (NFR-10).
**FRs covered:** FR-18, FR-19

**Dependencies:** each epic builds only on earlier ones. Epic 8 needs Epics 1-5. Epic 9 needs Epics 1-5 and 7 (Story 9.1 uses 7.1 encryption, Story 9.2 uses 7.2 offline login). Pilot go-live needs Epics 1-9: Returns are the only way to correct a Sale (FR-6). The dashboard shows more as each epic lands.

**Before specific stories:** the pilot's printer, scanner and cash drawer models (PRD open question 1) are needed for Story 4.1. The current Delivery entry time (SM-2 baseline, open question 4) must be measured before Epic 8 replaces the old process.

## Epic 1: Mart onboarding and platform foundation

A Super Admin registers a Mart and its Owner; the Owner activates and sets up Branches; every Mart's data is isolated and every change is audited. Device registration is not enforced until Epic 2, so in this epic the Owner may act from any browser.

### Story 1.1: Project scaffold and build pipeline

As a developer,
I want the solution scaffolded on the agreed stack with a working build and test pipeline,
So that every later story starts from the same foundation.

**Requirements:** Stack and deployment shape (Additional Requirements), NFR-7, AD-1, AD-2

**Acceptance Criteria:**

**Given** an empty repository
**When** the scaffold is created
**Then** it contains a .NET 10 modular-monolith API project, EF Core 10 with Microting.EntityFrameworkCore.MySql against MySQL 8.4, and a React + Vite + MUI 9 web app with two entry points (Counter and Manager/Owner)
**And** the exact React and Vite versions are checked as current stable and recorded in the Architecture spine Stack table

**Given** the scaffold
**When** CI runs on a push
**Then** it builds backend and frontend, applies migrations to a throwaway MySQL 8.4, and runs backend and frontend tests
**And** a health endpoint returns OK under a versioned API route (for example `/api/v1/health`)

**Given** the backend code organization is still deferred (spine)
**When** this story is done
**Then** the chosen organization (vertical slices, layered, or Clean) is recorded as an AD in the spine

### Story 1.2: Super Admin sign-in

As a Super Admin,
I want to sign in with an account seeded in the database,
So that I can operate the platform without any in-app way to create Super Admins.

**Requirements:** FR-25

**Acceptance Criteria:**

**Given** a Super Admin account created by a seed script (email and hashed password)
**When** the Super Admin signs in with correct credentials
**Then** they reach the Super Admin area
**And** wrong credentials are refused with a generic message

**Given** the app
**When** anyone looks for a way to create a Super Admin
**Then** none exists in the UI or API

**Given** a Super Admin signs in or out
**When** the action completes
**Then** it is written to the platform audit log (who, what, when)

### Story 1.3: Register a Mart and its Owner, with tenant isolation

As a Super Admin,
I want to create a Mart with its Owner and get a one-time setup code,
So that a new customer can start without any deployment or code change.

**Requirements:** FR-25, NFR-6, NFR-9, AD-2, AD-3, AD-4

**Acceptance Criteria:**

**Given** the Super Admin on the Marts screen
**When** they enter Mart name, Owner name and Owner contact and save
**Then** a Mart is created with a unique 6-character Mart code (letters and digits, no 0, O, 1 or I), an Owner account with a numeric Staff ID, and a one-time setup code shown once
**And** missing Mart name, Owner name or contact blocks saving with a message

**Given** the Owner account and every later tenant-owned table
**When** they are stored
**Then** they carry `MartId`, and all reads and writes pass through the EF Core global query filter for the current Mart (AD-2); no unfiltered query exists

**Given** two Marts, A and B, with data
**When** the automated isolation test runs in CI
**Then** every API call authenticated for Mart A that targets Mart B data is refused or returns nothing, and the test fails the build if not

**Given** the Super Admin's Mart list
**When** it is shown
**Then** it shows Mart name, Mart code and status only, and the Super Admin API exposes no Mart business data

**And** creating a Mart is written to the platform audit log

### Story 1.4: Owner activation and login

As an Owner,
I want to activate my account with the setup code and log in,
So that I can start running my Mart.

**Requirements:** FR-25, FR-27, AD-4

**Acceptance Criteria:**

**Given** a valid, unused setup code that has not expired
**When** the Owner enters Mart code, Staff ID and setup code and sets a password
**Then** the account becomes active and the setup code stops working

**Given** a used or expired setup code
**When** it is entered
**Then** activation is refused with a clear message

**Given** an active Owner
**When** they log in with Mart code, Staff ID and password
**Then** they reach the Owner area of their Mart only, and the session carries the Mart context checked on every request

**Given** wrong credentials
**When** login is attempted
**Then** it is refused with a generic message and the attempt is written to the platform log (Story 1.2); the Mart Audit Log arrives in Story 1.5

### Story 1.5: Mart Audit Log

As an Owner,
I want every change in my Mart recorded in a log I can search,
So that I can always see who changed what.

**Requirements:** FR-20

**Acceptance Criteria:**

**Given** the Audit Log immutability mechanism is undecided (spine Deferred)
**When** this story starts
**Then** the mechanism is chosen (for example append-only table with no update or delete path in the app) and recorded as an AD in the spine

**Given** any audited change in a Mart
**When** it is saved
**Then** an Audit Log entry is written in the same transaction with who, what changed (old and new values), when (UTC) and from which device or browser

**Given** the app and its API
**When** anyone tries to edit or delete an Audit Log entry
**Then** no such path exists

**Given** the Owner on the Audit Log screen
**When** they filter by date range, user or kind of change
**Then** matching entries are listed, newest first, from their own Mart only

### Story 1.6: Manage Branches

As an Owner,
I want to create, edit and deactivate Branches,
So that I can run several shop locations under one Mart.

**Requirements:** FR-26, NFR-5, NFR-11, AD-3, AD-12

**Acceptance Criteria:**

**Given** the Owner on the Branches screen
**When** they create a Branch with a name and time zone (default Asia/Karachi)
**Then** the Branch is saved with `MartId` and appears in the list; creating and deactivating Branches is Owner-only

**Given** an existing Branch
**When** the Owner edits its name or time zone, or deactivates it
**Then** the change is saved, a deactivated Branch is marked inactive and its history stays visible to the Owner

**Given** the Mart
**When** the Owner views its settings
**Then** they can set the Mart's currency (default PKR, whole units), default time zone, and the long-pending Return threshold (default 30 minutes, FR-19)

**Given** a Branch
**When** the Owner, or a user with manage Branches and devices assigned to it, edits its settings
**Then** they can set its cutover date (used by opening stock, Story 6.1) and the local time of the nightly stock balance check (default 03:00, Story 6.5)

**And** every Branch and Mart setting change is written to the Audit Log
**And** the two-Mart isolation test covers Branches

### Story 1.7: Suspend and reactivate a Mart

As a Super Admin,
I want to suspend or reactivate a Mart,
So that I can switch a customer off or on by hand while there is no billing.

**Requirements:** FR-25

**Acceptance Criteria:**

**Given** an active Mart
**When** the Super Admin suspends it
**Then** its status becomes suspended and every login and API request for that Mart is refused on next contact with a "Mart suspended" message, except Counter uploads of unsynced data, which are still accepted (Story 7.9)

**Given** a suspended Mart
**When** the Super Admin reactivates it
**Then** its users can log in again and no data was lost or changed

**Given** a suspension or reactivation
**When** it happens
**Then** it is written to the platform audit log, and other Marts are unaffected

**And** Counter behavior for suspended Marts (offline lock and resync) is out of scope here and covered in Epic 7

### Story 1.8: Hosting, deployment and backups

As a Super Admin,
I want the system running on a chosen host with hourly backups and a tested restore,
So that the pilot can go live without risking its data.

**Requirements:** NFR-2, NFR-7, AD-2

**Acceptance Criteria:**

**Given** the hosting platform is undecided (spine Deferred)
**When** this story starts
**Then** a host is chosen that supports MySQL 8.4 with point-in-time recovery at a small monthly cost (NFR-7), and it is recorded as an AD in the spine

**Given** the CI pipeline (Story 1.1)
**When** the main branch builds green
**Then** it deploys to a staging environment, and production deploys are a manual, logged step that applies migrations first

**Given** the production database
**When** it is set up
**Then** automatic backups run at least every hour with point-in-time recovery, and backups are kept for at least 7 days `[ASSUMPTION]`

**Given** a backup
**When** a restore is rehearsed into a separate environment
**Then** the data is complete up to the chosen point, the steps are written down, and the restore test is repeated before pilot go-live (NFR-2)

**And** secrets (database and signing keys) are kept outside the repository, and HTTPS is enforced (NFR-3)

## Epic 2: Staff, Roles and Registered Devices

The Owner defines Roles from the fixed Permission list, creates staff who activate their own PINs, and registers or revokes devices; the server enforces Permission, Branch and Registered Device on every request; a locked-out Owner can recover through the Super Admin.

### Story 2.1: Define Roles from the Permission list

As an Owner,
I want to build Roles from a fixed list of Permissions,
So that each job in my Mart gets exactly the access it needs.

**Requirements:** FR-1, AD-5

**Acceptance Criteria:**

**Given** a new Mart
**When** the Owner opens Roles
**Then** starter Roles Cashier (sell, request Return) and Manager (every Permission except view dashboard) exist and can be copied or edited

**Given** the fixed Permission list (sell, request Return, approve Return, manage Products, manage Deliveries, manage suppliers, run Spot Counts, close Shifts, view dashboard, view Exceptions Report, view Audit Log, manage staff and Roles, reset PINs, manage Branches and devices)
**When** the Owner creates or edits a Role
**Then** they can choose any subset and name the Role; no other Permissions can be added

**Given** the Owner account
**When** anyone tries to reduce its Permissions
**Then** it is refused; the Owner always holds every Permission in every Branch

**Given** a non-Owner user with manage staff and Roles (for example a Manager)
**When** they create, edit or assign a Role that includes a Permission they do not hold, or change their own Role
**Then** it is refused, so a Manager can never give anyone, including themselves, view dashboard

**And** every Role change is written to the Audit Log

### Story 2.2: Create staff accounts and assign Roles per Branch

As an Owner,
I want to add staff and give each a Role in each Branch they work in,
So that people can be set up without sharing logins.

**Requirements:** FR-1, FR-26, FR-27

**Acceptance Criteria:**

**Given** the Owner on the Staff screen
**When** they enter a name, optional phone number, and one or more Branch + Role pairs and save
**Then** an account is created with a numeric Staff ID unique in the Mart, and an 8-digit one-time activation code valid for 7 days is shown once
**And** names and phone numbers need not be unique

**Given** an existing staff account
**When** the Owner changes its Branch + Role assignments
**Then** the new assignments apply from the user's next request

**And** account creation and every assignment change are written to the Audit Log

### Story 2.3: Staff activation and login

As a staff member,
I want to set my own PIN with my activation code and then log in,
So that nobody else ever knows my PIN.

**Requirements:** FR-27, NFR-3, AD-4

**Acceptance Criteria:**

**Given** a valid, unused, unexpired activation code
**When** the staff member enters Mart code, Staff ID and the code, then sets a PIN of at least 6 digits (or a password)
**Then** the account is active, the code stops working, and the PIN is stored only as a slow hash

**Given** an expired or used activation code
**When** it is entered
**Then** activation is refused and the user is told to ask for a new code

**Given** an active account
**When** the user logs in with Mart code, Staff ID and PIN
**Then** they reach the screens for their Mart and assigned Branches

### Story 2.4: Enforce Permissions and Branch assignment on every request

As an Owner,
I want the server to block anything a user's Role does not allow,
So that hiding a button is never the only protection.

**Requirements:** FR-1, FR-26, NFR-3, AD-5

**Acceptance Criteria:**

**Given** a user whose Role in Branch X lacks a Permission
**When** they call the matching API directly
**Then** the server refuses it, and the UI hides or disables that action

**Given** a user assigned only to Branch X
**When** they request data or actions for Branch Y
**Then** the server refuses it; the Owner can act on all Branches

**Given** a user who holds a Permission in some but not all active Branches
**When** they change Mart-wide data with it (Mart price, Product details, suppliers, Roles)
**Then** the server refuses it; they can still change Branch data (Branch price, reorder level) in the Branches where they hold it

**Given** the authorization rules
**When** CI runs
**Then** automated tests cover each Permission being refused without it and allowed with it

### Story 2.5: Disable accounts and reset PINs

As an Owner,
I want to disable staff and reset forgotten PINs,
So that leavers lose access and forgetful staff get back in quickly.

**Requirements:** FR-1, FR-27

**Acceptance Criteria:**

**Given** an active staff account
**When** the Owner, or a user with manage staff and Roles whose Role is higher than the staff member's, disables it
**Then** it cannot log in on any online device and its open sessions end on their next request

**Given** a staff member who forgot their PIN
**When** the Owner, or a user with reset PINs whose Role ranks above the staff member's, generates a reset
**Then** a new 8-digit activation code (7 days) is shown, the old PIN stops working at once, and the staff member sets a new PIN with the code

**Given** a user with reset PINs
**When** they try to reset someone whose Role is equal or higher, or the Owner
**Then** it is refused. A Role is lower when its Permissions in that Branch are a strict subset of the resetter's; with the starter Roles a Manager can reset Cashiers but not another Manager or the Owner

**And** every disable and reset is written to the Audit Log, showing who reset whom

### Story 2.6: Register a Branch's first device

As an Owner,
I want a one-time setup code to register the first machine at a new Branch,
So that the Branch can start operating on a trusted machine.

**Requirements:** FR-2, FR-22

**Acceptance Criteria:**

**Given** the device token lifecycle is undecided (spine Deferred)
**When** this story starts
**Then** the token format, storage, rotation and revocation check are chosen and recorded as an AD in the spine

**Given** a newly created Branch
**When** the Owner opens it
**Then** a one-time setup code for its first device is shown, valid once and with an expiry

**Given** a machine at the Branch
**When** the setup code and a device name are entered there
**Then** the server registers it to that Branch and issues it a secret device token, and the code stops working

**Given** a password alone
**When** anyone tries to register a device with it
**Then** registration is refused

**And** registration is written to the Audit Log

### Story 2.7: Add and revoke Registered Devices

As an Owner,
I want to add more machines with short-lived codes and revoke lost ones,
So that only the Branch's own machines are trusted.

**Requirements:** FR-2, FR-22

**Acceptance Criteria:**

**Given** the Owner (or a user with manage Branches and devices) on a Registered Device
**When** they generate an add-device code for a Branch
**Then** a short one-time code is shown, valid for 10 minutes

**Given** a new machine at the Branch
**When** the code is entered within 10 minutes
**Then** the machine is registered to that Branch and receives its own token; after 10 minutes or one use the code is refused

**Given** a Registered Device
**When** the Owner revokes it from any other Registered Device
**Then** its token is rejected and its sessions end on its next contact with the server

**And** additions and revocations are written to the Audit Log

### Story 2.8: Enforce Registered Devices

As an Owner,
I want writes and selling allowed only from my Branch's registered machines,
So that a stolen password cannot change my data from outside the Mart.

**Requirements:** FR-2, NFR-3, AD-5

**Acceptance Criteria:**

**Given** any user on a device that is not a Registered Device of the Branch
**When** they log in
**Then** they get read-only screens and every write request is refused by the server

**Given** a user whose Role includes sell
**When** they try to log in on an unregistered device or a device of another Branch to sell
**Then** no selling session is created

**Given** a Registered Device of a Branch
**When** a user logs in on it
**Then** the Mart code is not asked for (the device knows its Mart), only Staff ID and PIN

**Given** the Owner's phone or home PC
**When** anyone tries to register it outside the setup or add-device code flow
**Then** there is no other path; the device-check rule is covered by automated tests

### Story 2.9: Recover with the offline recovery code

As an Owner,
I want a recovery code to register a device when every Registered Device of a Branch is lost,
So that I am never locked out of my own Branch.

**Requirements:** FR-22

**Acceptance Criteria:**

**Given** a Mart being activated
**When** the Owner first logs in
**Then** a recovery code is shown once with an instruction to keep it offline, and the Owner can generate a new one later (which voids the old one)

**Given** a Branch with no working Registered Device
**When** the Owner enters the recovery code on a machine at the Branch
**Then** the machine is registered to that Branch and the recovery code is used up

**And** recovery-code generation and use are written to the Audit Log

### Story 2.10: Owner recovery through the Super Admin

As an Owner who lost both password and recovery code,
I want the Super Admin to re-issue my access after checking who I am,
So that I can get back in without the Super Admin seeing my data.

**Requirements:** FR-22, FR-25

**Acceptance Criteria:**

**Given** the Super Admin has checked the Owner's identity outside the system
**When** they choose "re-issue Owner access" for that Mart
**Then** a one-time Owner activation code is shown, the Owner's old password stops working, and the Super Admin still sees no Mart business data

**Given** the Owner with the new code
**When** they activate
**Then** they set a new password and get a new recovery code, and see a notice that access was re-issued by the Super Admin, with the time

**And** the re-issue is written to both the platform audit log and the Mart's Audit Log

## Epic 3: Product catalog and barcodes

A Manager sets up Products, Branch prices, reorder levels and the Barcode model (generic Products, pack Barcodes, in-store codes), and imports up to 500,000 Products from CSV in the background. All catalog writes require the manage Products Permission on a Registered Device (Epic 2).

### Story 3.1: Create, edit and deactivate Products

As a Manager,
I want to add and maintain Products with a Barcode, price and Conversion,
So that every item on display is registered before it is sold.

**Requirements:** FR-9, FR-28, AD-7, AD-11

**Acceptance Criteria:**

**Given** a user with manage Products on a Registered Device
**When** they create a Product with name (Urdu text allowed), one Barcode, selling price in whole currency units, and Conversion (Units per Pack, Packs per Carton; optional at creation)
**Then** the Product is saved Mart-wide and its Barcode is stored in the Barcode table (`MartId`, `Barcode`, `ProductId`, Units per scan = 1) (AD-11)

**Given** a Barcode already linked to any Product in the Mart
**When** another Product is saved with it
**Then** saving is refused and the message names the Product that holds it

**Given** an existing Product
**When** the user edits it or deactivates it
**Then** the change is saved, a deactivated Product cannot be added to new Deliveries, and its history stays

**Given** any Product, Barcode or price change
**When** it is saved
**Then** it receives a Mart-wide increasing change version (the delta cursor for Counter sync, AD-7)
**And** it is written to the Audit Log with old and new values

### Story 3.2: Find Products quickly in a large catalog

As a Manager,
I want to search Products by name or Barcode,
So that I can find any item among 500,000 without scrolling.

**Requirements:** FR-9, NFR-8, NFR-10

**Acceptance Criteria:**

**Given** a Mart with 500,000 Products
**When** the user types part of a name or a full Barcode
**Then** matching Products appear, paged, with first results within 3 s (NFR-10 screen target)

**Given** the result list
**When** the user filters by active or deactivated
**Then** only matching Products show

### Story 3.3: Several Barcodes per Product and generic Products

As a Manager,
I want to link several brands' printed Barcodes to one generic Product,
So that items sold at one price can be priced and counted together without stickers.

**Requirements:** FR-28, AD-11

**Acceptance Criteria:**

**Given** a Product
**When** the user adds or removes Barcodes on it
**Then** each Barcode is linked to that Product only, and a Barcode already held elsewhere is refused unless the user chooses to move it

**Given** a Barcode held by Product A
**When** the user moves it to Product B and confirms
**Then** scans from then on resolve to B, stock already recorded stays with A, and the move is written to the Audit Log with both Products

**Given** a generic Product (for example Bottle 1.5L) with several brands' Barcodes
**When** any of them is looked up
**Then** it resolves to the same Product and the same single price

### Story 3.4: Pack Barcodes

As a Manager,
I want a carton or pack Barcode to count as a set number of Units,
So that scanning a sealed carton at the Counter adds the right quantity.

**Requirements:** FR-28, AD-11

**Acceptance Criteria:**

**Given** a Product
**When** the user adds a Barcode with Units per scan greater than 1 (for example 6)
**Then** it is saved as a pack Barcode and shown with its Unit quantity

**Given** a pack Barcode
**When** it is looked up
**Then** the lookup returns the Product and its Units per scan, so all stock stays in Units

### Story 3.5: In-store codes for unlabeled items

As a Manager,
I want the system to create Barcodes for items with no printed barcode,
So that every item can still be scanned or typed in.

**Requirements:** FR-28, AD-11

**Acceptance Criteria:**

**Given** a Product with no printed Barcode
**When** the user chooses "generate in-store code"
**Then** the server creates a valid EAN-13 code with a prefix in 20 to 29, unique within the Mart, and links it to the Product

**Given** in-store codes
**When** the user prints labels for chosen Products or a code list
**Then** a printable page with Product name, price and scannable barcode is produced

### Story 3.6: Branch prices and reorder levels

As a Manager,
I want a different price or reorder level at one Branch,
So that each shop can price and restock for its own situation.

**Requirements:** FR-9, AD-3

**Acceptance Criteria:**

**Given** a Product with a Mart price
**When** the user sets a price override for Branch X
**Then** Branch X uses the override and other Branches keep the Mart price; removing the override returns X to the Mart price

**Given** a Product
**When** the user sets a reorder level for a Branch
**Then** it is saved per Branch, and Products with no level set have none

**And** overrides and reorder levels are versioned for sync and written to the Audit Log

### Story 3.7: Bulk import Products from CSV

As a Manager,
I want to import a large Product file in the background,
So that I can load the whole catalog at cutover without typing it.

**Requirements:** FR-10, NFR-10

**Acceptance Criteria:**

**Given** the background job mechanism is undecided (spine Deferred)
**When** this story starts
**Then** it is chosen and recorded as an AD in the spine, and it also serves later imports and scheduled checks

**Given** a CSV with a header row and the columns `name`, `selling_price`, `units_per_carton`, `units_per_pack` (blank if none) and `barcodes` (several separated by `|`; a pack Barcode written as `barcode*units`, for example `8961234567890*12`), downloadable from the import screen as a template
**When** the user uploads it
**Then** the import runs in the background with a progress display, and the user can keep using other screens

**Given** rows that are invalid (missing field, bad price, Barcode already held by another Product, duplicate Barcode in the file)
**When** the import finishes
**Then** valid rows are imported and invalid rows are listed with row number and reason, downloadable

**Given** a 500,000-row file
**When** it is imported
**Then** it completes within 30 minutes without errors (NFR-10), each imported Product gets a change version, and the import is written to the Audit Log as one entry with counts

## Epic 4: Selling at the Counter

A Cashier scans (or types) Barcodes, takes cash or card, and prints a numbered Sales Receipt; Sales save on the Counter first and sync in real time. Starts with the AD-1 spike. New prices apply as they arrive in this epic; Epic 5 holds them until the Shift boundary. Long-outage rules (offline login, 72-hour limit, parked events) come in Epic 7.

There is no UX document. Before Story 4.5, sketch the Counter's keyboard and focus flows (scan, typed Barcode, payment, Shift open and close, Approver login over a Cashier session) and agree them with the product owner.

### Story 4.1: Counter platform spike (AD-1 gate)

As the Owner of the product,
I want proof that a browser Counter can hold 500,000 Products and print on a real receipt printer fast enough,
So that we commit to web-first or move to Electron before building on it.

**Requirements:** NFR-4, NFR-8, NFR-10, AD-1

**Acceptance Criteria:**

**Given** 500,000 generated Products with Barcodes loaded into IndexedDB on a typical Counter PC
**When** Barcodes are looked up and names are searched, measured over at least 1,000 operations
**Then** the 95th-percentile results are recorded against NFR-10: Barcode lookup under 200 ms, name search first results under 500 ms

**Given** a real ESC/POS thermal printer (model recorded; PRD open question 1)
**When** a sample receipt is printed from the browser
**Then** the print method is recorded and time from "complete Sale" to printed receipt is measured against the 2 s target

**Given** the measurements
**When** the spike ends
**Then** the result (pass, or move to Electron + SQLite) and the storage size used are recorded in the spine under AD-1, and the gate is marked passed or failed

### Story 4.2: Counter app shell and Counter registration

As a Cashier,
I want an installed Counter app that knows its Branch and lets me log in,
So that I can start selling on my till.

**Requirements:** FR-2, FR-15, FR-23, NFR-4, AD-1

**Acceptance Criteria:**

**Given** a Registered Device (Epic 2)
**When** the Owner marks it as a Counter
**Then** it gets a Counter code unique in the Mart (for example C1) and its receipt count starts at 0

**Given** the Counter entry point
**When** it is opened in a desktop browser
**Then** it can be installed as a web app, requests persistent storage, and shows online, offline or syncing status

**Given** the Counter code
**When** it is reviewed
**Then** UI and logic reach storage, printer, scanner, cash drawer and crypto only through `CounterStore`, `ReceiptPrinter`, `Scanner`, `CashDrawer` and `Crypto` interfaces (AD-1), and nothing that matters to a Sale is kept in localStorage

**Given** an online Counter
**When** a user with sell for that Branch enters Staff ID and PIN
**Then** a selling session starts; users without sell, or for another Branch, are refused

**Given** a user without sell but with approve Return or close Shifts for that Branch
**When** they log in at the Counter
**Then** a limited session starts that can only decide Returns (Story 9.2) and close Shifts (Story 5.3), and cannot sell

### Story 4.3: First catalog download

As a Cashier at a new or replaced Counter,
I want the full Product catalog downloaded reliably,
So that every scan works even without internet.

**Requirements:** FR-16, FR-22, NFR-8, AD-6, AD-7

**Acceptance Criteria:**

**Given** a Counter with no catalog
**When** it starts its first download
**Then** Products (Barcodes with Units per scan, name, Branch price, Conversion) arrive in compressed pages with a progress bar, and are stored in a Barcode-keyed local index; no stock quantities are downloaded

**Given** a download interrupted by closing the app or losing the connection
**When** it resumes
**Then** it continues from the last completed page

**Given** an incomplete catalog
**When** a Cashier tries to sell
**Then** selling is blocked with "catalog download in progress"

**Given** a replacement Counter machine (FR-22)
**When** it is registered
**Then** it downloads the full catalog from the cloud the same way; there is no copying between Counters

### Story 4.4: Live catalog updates

As a Cashier,
I want Product changes to reach my Counter within seconds,
So that I never sell a deactivated item or miss a new Barcode.

**Requirements:** FR-9, FR-16, AD-7

**Acceptance Criteria:**

**Given** push versus short polling is undecided (spine)
**When** this story starts
**Then** the mechanism is chosen and recorded as an AD in the spine; it must also carry Return decisions (Story 9.3) and staff and device changes to Counters within seconds

**Given** an online Counter with a complete catalog
**When** a Product, Barcode, Branch price or deactivation changes in the cloud
**Then** the Counter receives only changes after its version cursor, within 5 s, including Barcode moves and removals

**Given** a deactivated Product or removed Barcode
**When** it is scanned after the update
**Then** the Counter treats it as not found

**Given** a Counter that was offline
**When** it reconnects
**Then** it fetches all changes since its cursor without any action by the Cashier

**And** in this epic new prices apply when received; Epic 5 changes this to the Shift boundary

### Story 4.5: Build a cart by scanning

As a Cashier,
I want each scan to add the item instantly,
So that the queue keeps moving.

**Requirements:** FR-4, FR-28, NFR-10

**Acceptance Criteria:**

**Given** a selling session
**When** a Barcode is scanned with the USB keyboard-wedge scanner
**Then** the line shows name, price, quantity and line total within 200 ms, online or offline, and the cart total updates in the Mart's currency

**Given** the same Barcode scanned again
**When** it is read
**Then** the existing line's quantity increases

**Given** a pack Barcode with 6 Units per scan
**When** it is scanned
**Then** the line quantity increases by 6 Units

**Given** a line in the cart
**When** the Cashier changes its quantity or removes it before payment
**Then** the cart updates; the Cashier has no way to change a price, discount or hold a cart

**Given** an unknown Barcode
**When** it is scanned
**Then** a "not found" message shows and nothing is added

### Story 4.6: Type in a Barcode that will not scan

As a Cashier,
I want to type a Barcode and quantity by hand,
So that a customer still gets an item with a damaged label.

**Requirements:** FR-5

**Acceptance Criteria:**

**Given** a selling session
**When** the Cashier types a Barcode number (Unit, pack or in-store code) and a quantity
**Then** the same Product line is added as a scan would add

**Given** a typed entry
**When** it is added
**Then** it is marked as typed-in with Cashier and Counter, for the Exceptions Report

**Given** an unknown typed Barcode
**When** it is entered
**Then** "not found" shows and nothing is added

### Story 4.7: Complete a Sale with a receipt number

As a Cashier,
I want to finish a Sale by recording cash or card,
So that the Sale is saved at once whatever the network does.

**Requirements:** FR-6, FR-23, AD-6, AD-7

**Acceptance Criteria:**

**Given** a cart with at least one line
**When** the Cashier chooses cash or card and confirms
**Then** the Sale is saved on the Counter first with a client-generated ID, Cashier, Counter, Branch, Counter time, lines with the price used, total and payment type
**And** it gets the next receipt number for that Counter (for example C1-000124), created without internet and never repeated on that Counter

**Given** a Sale that takes a Product's stock below zero
**When** it is completed
**Then** it completes normally; the Counter never checks stock

**Given** a completed Sale
**When** anyone tries to edit it
**Then** there is no edit path; corrections go through a Return (Epic 9)

### Story 4.8: Print and reprint the Sales Receipt

As a Cashier,
I want a receipt printed after each Sale,
So that the customer has proof of purchase.

**Requirements:** FR-7, NFR-11

**Acceptance Criteria:**

**Given** a completed Sale
**When** it is saved
**Then** the ESC/POS printer prints Mart name, Branch name, local date and time (Branch time zone), Cashier, lines with quantity and price, total, payment type and receipt number

**Given** the last Sale
**When** the Cashier chooses reprint
**Then** the same receipt prints with the same receipt number

**Given** the printer fails or is out of paper
**When** a Sale completes
**Then** the Sale is still saved, an error shows, and the Cashier can reprint once fixed

### Story 4.9: Sync Sales to the cloud

As an Owner,
I want every Sale to reach the cloud within seconds, exactly once,
So that stock and sales figures are right and nothing is lost.

**Requirements:** FR-6, FR-16, AD-1, AD-6, AD-7, AD-10

**Acceptance Criteria:**

**Given** the sync engine
**When** it is built
**Then** it is plain TypeScript with no browser APIs, takes a `CounterStore` and HTTP client, and is tested against a fake store (AD-1)

**Given** an online Counter
**When** a Sale is saved
**Then** it is uploaded within 5 s; when offline, Sales queue and upload oldest first in batches as soon as the connection returns, with no Cashier action

**Given** the same Sale uploaded twice (retry after a dropped connection)
**When** the server receives it
**Then** it is stored once and the repeat changes nothing

**Given** a Sale accepted by the server
**When** it is stored
**Then** the server records its receive time, creates one Stock Event per line in Units, and updates the stock balance for each Product and Branch in the same transaction (AD-10)

**Given** two Counters selling the same Product, one of them offline
**When** both have synced
**Then** stock reflects both Sales with no conflict

**Given** a Sale acknowledged by the server
**When** 48 hours have passed
**Then** the Counter clears its local copy

**And** the Owner can see the last successful Sync time per Counter, and the Counter shows a Sync failure when one happens

### Story 4.10: Replacement Counter keeps receipt numbers unique

As an Owner,
I want a replacement till to continue the old Counter's numbering safely,
So that no two receipts ever share a number.

**Requirements:** FR-22, FR-23

**Acceptance Criteria:**

**Given** a dead Counter C1 that has been revoked
**When** a new machine is registered and assigned to take over C1
**Then** it starts numbering from the last C1 number the cloud saw plus a safe gap of 10,000 (more than one Counter can issue within the 72-hour offline limit)

**Given** a later upload from the old machine (if it ever reconnects)
**When** its receipt numbers are below the gap
**Then** no number collides with the new machine's numbers

**And** the takeover is written to the Audit Log

## Epic 5: Shifts and cash control

A Cashier opens a Shift with a float and closes it with counted cash; expected cash and differences are recorded; a user with close Shifts can close an abandoned Shift; new prices take effect at Counters only at a Shift boundary.

### Story 5.1: Open a Shift with a cash float

As a Cashier,
I want to start my Shift by entering the cash already in the drawer,
So that my cash count at the end is measured from the right starting point.

**Requirements:** FR-15, FR-17

**Acceptance Criteria:**

**Given** a Cashier logged in at a Counter with no open Shift on that Counter (a Counter has at most one open Shift; another Cashier must wait until it is closed)
**When** they enter the opening float (whole currency units, zero allowed) and start the Shift
**Then** a Shift is created on the Counter with a client-generated ID, Cashier, Counter, Branch and start time, online or offline

**Given** no open Shift
**When** the Cashier tries to sell
**Then** selling is blocked until a Shift is opened

**Given** an open Shift
**When** Sales are completed
**Then** each Sale is linked to that Shift

**And** Shift records sync to the cloud with the same idempotent upload as Sales (Story 4.9)

### Story 5.2: Close a Shift with a cash count

As a Cashier,
I want to count my drawer and close my Shift,
So that any cash difference is caught the same day.

**Requirements:** FR-17, FR-24

**Acceptance Criteria:**

**Given** an open Shift
**When** the Cashier enters the counted cash and closes it
**Then** the Counter computes expected cash = opening float + cash Sales − accepted cash refunds in that Shift (refunds are zero until Epic 9 delivers Returns), records counted cash and the difference, and ends the Shift, online or offline

**Given** the close screen
**When** it is shown
**Then** it shows totals by payment type and expected cash after the count is entered, not before (so the count is blind)

**Given** a closed Shift
**When** anything changes later (for example a late Return acceptance)
**Then** the closed Shift is never recomputed

**And** a non-zero difference is marked for the Exceptions Report

### Story 5.3: Close a Shift left open

As a Manager,
I want to close a Shift a Cashier forgot to close,
So that the Counter can be used and the cash is still accounted for.

**Requirements:** FR-17

**Acceptance Criteria:**

**Given** a Shift left open on a Counter
**When** a user with close Shifts logs in at that Counter, counts the drawer and closes it
**Then** the Shift is closed with the counted cash and difference, and the close is attributed to that user, not the Cashier

**Given** a user without close Shifts
**When** they try the same
**Then** it is refused

**And** the close is written to the Audit Log on sync

### Story 5.4: New prices apply at the Shift boundary

As an Owner,
I want price changes to take effect only between Shifts,
So that no customer is charged a new price in the middle of a Shift.

**Requirements:** FR-9, FR-16, AD-7

**Acceptance Criteria:**

**Given** a price change (Mart or Branch) saved in the cloud
**When** an online Counter receives it during an open Shift
**Then** the Counter holds it and keeps selling at the old price

**Given** held price changes on a Counter
**When** a Shift is closed or a new Shift is opened
**Then** the held prices take effect before the next Sale

**Given** non-price Product changes (new Products, names, Barcodes, deactivations)
**When** they arrive
**Then** they still apply at once (Story 4.4)

**Given** a user with manage Products
**When** they view pending price changes
**Then** they see each saved price change and, per Counter, whether it has been applied yet

**And** each Sale line keeps the price actually used

### Story 5.5: Shift and Cashier totals for the Owner

As an Owner,
I want to see each Shift's cash result and each Cashier's daily sales,
So that I can check cash without waiting for a full dashboard.

**Requirements:** FR-17, FR-18, NFR-11

**Acceptance Criteria:**

**Given** synced Shifts
**When** the Owner (or a user with view dashboard or view Exceptions Report) opens the Shifts list for a Branch and a date
**Then** each Shift shows Cashier, Counter, start and end in the Branch's local time, float, cash Sales, cash refunds, expected cash, counted cash and difference

**Given** a Branch and a date in the Branch's time zone
**When** the Owner views Cashier totals
**Then** each Cashier's Sales total for that day is shown

**And** the screen is read-only and loads within 3 s for one day's data

## Epic 6: Stock accuracy

A Manager loads opening stock per Branch (on screen or by CSV) and runs Spot Counts that correct stock against the shelf; a scheduled check compares balances with Stock Events and reports drift. Placed early so the pilot can load opening stock before go-live. All writes need run Spot Counts (or Owner) on a Registered Device.

### Story 6.1: Enter opening stock on screen

As a Manager,
I want to enter the counted opening stock for each Product at my Branch,
So that the system starts from what is really on the shelves.

**Requirements:** FR-14, AD-10

**Acceptance Criteria:**

**Given** a Branch and its cutover date (set in Branch settings, Story 1.6)
**When** the user scans or searches a Product and enters a quantity in Units
**Then** an opening-count Stock Event dated at cutover is created and the stock balance updates in the same transaction (AD-10)

**Given** a Product that already has an opening count at this Branch
**When** the user enters a new figure
**Then** an adjusting Stock Event sets it to the new figure; the earlier event is not deleted

**Given** a pack Barcode is scanned
**When** a quantity is entered
**Then** the quantity is still taken in Units, and the screen says so

**And** each entry is written to the Audit Log

### Story 6.2: Import opening stock from CSV

As a Manager,
I want to import opening stock from a file,
So that a large Branch can be loaded without typing thousands of lines.

**Requirements:** FR-10, FR-14

**Acceptance Criteria:**

**Given** a CSV for one Branch with a header row and the columns `barcode` and `quantity_units`, downloadable from the import screen as a template
**When** the user uploads it
**Then** it runs as a background job (Story 3.7 mechanism) with progress, creating opening-count Stock Events and balance updates as in Story 6.1

**Given** invalid rows (unknown Barcode, non-whole or negative quantity, same Product twice in the file)
**When** the import finishes
**Then** valid rows are applied and invalid rows are listed with row number and reason, downloadable

**And** the import is written to the Audit Log as one entry with counts

### Story 6.3: Spot Count a Product

As a Manager,
I want to count one Product on the shelf and correct the system to match,
So that stock stays accurate between full counts.

**Requirements:** FR-13, AD-10

**Acceptance Criteria:**

**Given** a user with run Spot Counts at a Branch
**When** they pick a Product and enter the counted Units
**Then** the screen shows system Units (from the balance), counted Units and the difference

**Given** the user confirms
**When** the count is saved
**Then** a correcting Stock Event for the difference is created, computed against the balance at the moment of confirming, and the balance updates in the same transaction

**Given** a confirmed Spot Count
**When** it is saved
**Then** the Audit Log records system quantity, counted quantity, difference and user, and a non-zero difference is marked for the Exceptions Report

### Story 6.4: Spot Count a shelf

As a Manager,
I want to count several Products in one go,
So that I can check a whole shelf quickly.

**Requirements:** FR-13

**Acceptance Criteria:**

**Given** a shelf count started at a Branch
**When** the user scans or searches Products one after another and enters counted Units for each
**Then** each line shows system Units, counted Units and difference

**Given** the list
**When** the user confirms the shelf count
**Then** each line is saved exactly as a single Spot Count (Story 6.3); lines with zero difference create no Stock Event but are still recorded as counted

**Given** an unfinished shelf count
**When** the user leaves the screen
**Then** it is kept as a draft that can be resumed or discarded, and a draft changes no stock

### Story 6.5: Scheduled stock balance check

As an Owner,
I want the system to check that stored stock matches the Stock Events behind it,
So that a silent data error is caught rather than trusted.

**Requirements:** FR-19, AD-10

**Acceptance Criteria:**

**Given** the background job mechanism (Story 3.7)
**When** the scheduled check runs (daily at the Branch's stock check time, default 03:00 local, Story 1.6)
**Then** for every Product and Branch it recomputes stock from the Stock Events and compares it with the stored balance

**Given** a difference
**When** it is found
**Then** it is recorded for the Exceptions Report with Product, Branch, stored and recomputed values, and the balance is not changed

**Given** a Mart with 500,000 Products and several Branches
**When** the check runs
**Then** it completes without slowing Counters' sync or the Manager screens beyond NFR-10 targets

## Epic 7: Offline resilience and data safety

Counters keep selling through long outages and survive revoked devices, suspended Marts and cloud restores without losing a Sale. Builds on the local-first Sale and sync engine from Epic 4.

### Story 7.1: Protect Counter data at rest

As an Owner,
I want sensitive data on each Counter encrypted,
So that a stolen till does not expose logins or unsent Sales.

**Requirements:** FR-3, NFR-3, AD-9

**Acceptance Criteria:**

**Given** a Counter
**When** it stores cached credentials, its device token, unsynced Sales, Shifts and Return records
**Then** they are encrypted at rest through the `Crypto` interface with a key the page cannot export (for example a non-extractable Web Crypto key)

**Given** the local Product catalog
**When** it is stored
**Then** it is not encrypted (decided 2026-10-07)

**Given** the stored data
**When** it is inspected with browser developer tools
**Then** no PIN, PIN hash, token or Sale content is readable in plain text

### Story 7.2: Log in at the Counter without internet

As a Cashier,
I want to log in while the internet is down,
So that a Shift can start during an outage.

**Requirements:** FR-1, FR-3, AD-9

**Acceptance Criteria:**

**Given** a Counter that has synced at least once
**When** it syncs
**Then** it caches slow hashes of credentials for accounts that are active and assigned to its Branch, and removes accounts that are disabled or reassigned

**Given** the Counter is offline
**When** a cached user enters Staff ID and PIN
**Then** they log in with the Permissions they had at the last Sync

**Given** a user not in the cache (new, disabled or other Branch)
**When** they try to log in offline
**Then** they are refused with "needs connection"

**And** an Approver can log in this way to approve Returns (used in Epic 9)

### Story 7.3: Lock a Staff ID after wrong PINs

As an Owner,
I want repeated wrong PINs at a Counter to lock that Staff ID for a while,
So that nobody can guess a PIN at the till.

**Requirements:** FR-3, AD-9

**Acceptance Criteria:**

**Given** a Staff ID at a Counter
**When** 5 wrong PINs are entered in a row, online or offline
**Then** that Staff ID is locked on that Counter for 5 minutes, and each further lock in a row doubles (10, 20, ...)

**Given** a successful login
**When** it happens
**Then** the wrong-PIN count and lock length reset for that Staff ID on that Counter

**Given** the lock state
**When** the Counter restarts or loses connection
**Then** the lock still applies, because it is kept in the Counter store

**And** failed attempts and locks sync to the cloud for the Exceptions Report

### Story 7.4: 72-hour offline limit

As an Owner,
I want a Counter that has not reached the server for 72 hours to stop selling,
So that revoked devices and disabled accounts cannot keep working forever offline.

**Requirements:** FR-15, NFR-1, AD-9

**Acceptance Criteria:**

**Given** a Counter
**When** it is offline
**Then** it shows the time left until it must check in, measured from its last successful Sync

**Given** less than 24 hours remain
**When** the Cashier or Manager is logged in
**Then** a visible warning shows

**Given** the Counter's clock is set back or forward
**When** time left is calculated
**Then** the change does not extend the limit (elapsed time is tracked from stored checkpoints and never goes backwards)

**Given** the limit is reached during a Sale
**When** the Cashier completes it
**Then** that Sale finishes and prints, then the Counter accepts no new logins and no new Sales until a Sync succeeds

**Given** a locked Counter
**When** it is locked
**Then** all unsynced data stays stored and is sent on the next Sync; nothing is deleted

### Story 7.5: Unsynced Sales warnings

As a Manager,
I want to know when Sales are stuck on a Counter,
So that a problem is fixed before data is at risk.

**Requirements:** FR-16

**Acceptance Criteria:**

**Given** a Counter holding unsynced Sales older than 1 hour
**When** a Cashier or Manager is logged in
**Then** a warning shows with the count and age of the oldest unsynced Sale

**Given** the Owner's view of Counters
**When** it is opened
**Then** each Counter shows its last successful Sync time and the unsynced Sale count it last reported

### Story 7.6: Park rejected events

As an Owner,
I want a Sale the server cannot accept to be set aside and shown, not lost or blocking,
So that one bad record never stops the rest from syncing.

**Requirements:** FR-16, AD-7

**Acceptance Criteria:**

**Given** an uploaded event the server rejects as invalid (for example unknown Product)
**When** the response comes back
**Then** the Counter parks the event, shows it as a problem on the Counter, and keeps syncing later events

**Given** a parked event
**When** the server rejects it
**Then** the server keeps a copy with the rejection reason in a parked list for the Mart, visible to users with view Exceptions Report

**Given** a parked event
**When** anyone looks for accept, dismiss or delete
**Then** none exists; it is view-only and never deleted (decided 2026-10-12), and stock is fixed through normal correcting records

### Story 7.7: Uploads from revoked devices and deactivated Branches

As an Owner,
I want Sales made before I revoked a till to still count,
So that real cash already taken is not lost from my figures.

**Requirements:** FR-16, FR-26, AD-7

**Acceptance Criteria:**

**Given** a revoked Counter, or a Counter of a deactivated Branch, that still holds unsynced events
**When** it reconnects
**Then** it may upload but cannot log anyone in or sell

**Given** an event with Counter time before the revoke or deactivation time
**When** it is uploaded
**Then** it is accepted (Stock Events and balance as usual) and flagged for the Exceptions Report

**Given** an event with Counter time after the revoke or deactivation time
**When** it is uploaded
**Then** it is parked (Story 7.6)

### Story 7.8: Re-send after a cloud restore

As an Owner,
I want Counters to fill the gap if the cloud database is restored from backup,
So that Sales made after the backup are not lost.

**Requirements:** FR-16, NFR-2, AD-7

**Acceptance Criteria:**

**Given** hourly point-in-time backups are configured and a restore has been tested (NFR-2)
**When** a restore is performed
**Then** the server's restore epoch is raised as part of the restore procedure

**Given** a Counter that sees a new restore epoch
**When** it next syncs
**Then** it re-sends every event it still holds, including acknowledged ones within their 48-hour window, and repeats are ignored by their IDs

**Given** a restore test in a staging environment
**When** Sales made after the backup point are re-sent
**Then** cloud totals and stock match the Counters with no duplicates

### Story 7.9: Counters of a suspended Mart

As a Super Admin,
I want a suspended Mart's Counters to stop selling without losing data,
So that switching a customer off is safe for them and for us.

**Requirements:** FR-25, AD-9

**Acceptance Criteria:**

**Given** a Mart is suspended
**When** an online Counter of that Mart next contacts the server
**Then** it finishes any Sale in progress, uploads its unsynced Sales, Returns and Shift data (the server accepts them), then locks: no new logins or Sales

**Given** an offline Counter of a suspended Mart
**When** it never reconnects
**Then** it locks at the 72-hour limit at the latest (Story 7.4)

**Given** a locked Counter of a suspended Mart
**When** it is locked
**Then** any data it could not upload stays stored on the Counter; nothing is deleted

**Given** the Mart is reactivated
**When** a Counter reconnects
**Then** its first action is a full Sync, and selling resumes only after that Sync completes

## Epic 8: Receiving Deliveries

A Manager records supplier Deliveries in Cartons, Packs or Units with purchase prices, converted to Units, and corrects Deliveries without deleting history. All writes need the relevant Permission on a Registered Device.

Before this epic starts, measure how long the Manager takes to enter a typical Delivery today (SM-2 baseline), and settle whether expiry dates are tracked (PRD open question 3).

### Story 8.1: Manage suppliers

As a Manager,
I want a list of suppliers,
So that every Delivery records who it came from.

**Requirements:** FR-21

**Acceptance Criteria:**

**Given** a user with manage suppliers
**When** they create or edit a supplier with name and contact details
**Then** the supplier is saved Mart-wide

**Given** a supplier
**When** it is deactivated
**Then** it can no longer be chosen for new Deliveries, and past Deliveries still show it

**And** supplier changes are written to the Audit Log

### Story 8.2: Enter a Delivery

As a Manager,
I want to enter a supplier Delivery in cartons and packs,
So that stock goes up in Units without hand arithmetic.

**Requirements:** FR-11

**Acceptance Criteria:**

**Given** a user with manage Deliveries at a Branch
**When** they start a Delivery
**Then** they must choose an active supplier, and can add lines by scanning or searching a Product

**Given** a line
**When** the user enters a quantity as Cartons, Packs or Units and a purchase price for that quantity
**Then** the line shows the converted Unit quantity and the purchase price per Unit, using the Product's Conversion

**Given** a Product with no Conversion
**When** the user enters Cartons or Packs for it
**Then** the line is blocked with a message, and the user can set the Conversion from there (with manage Products) and continue

**Given** a complete Delivery
**When** the user confirms it
**Then** one Stock Event per line is created in Units, the balance updates in the same transaction, supplier and purchase price are stored per line, and the Delivery is written to the Audit Log

**Given** an unconfirmed Delivery
**When** the user leaves the screen
**Then** it is kept as a draft that changes no stock

### Story 8.3: Conversion override and counted quantities

As a Manager,
I want to handle a supplier's odd pack size or a short carton,
So that stock reflects what actually arrived.

**Requirements:** FR-11

**Acceptance Criteria:**

**Given** a Delivery line
**When** the user overrides Units per Pack or Packs per Carton for that line
**Then** the Unit quantity is recalculated, the override applies to that line only, and it is recorded on the line

**Given** a sealed Carton line
**When** the user keeps the label quantity
**Then** stock is added at the label quantity

**Given** a Carton the user opened and counted
**When** they enter the counted Units
**Then** stock is added at the counted quantity, and the difference from the label quantity is recorded on the line

### Story 8.4: Correct a confirmed Delivery

As a Manager,
I want to fix a mistake in a confirmed Delivery,
So that stock is right without losing what was originally entered.

**Requirements:** FR-12

**Acceptance Criteria:**

**Given** a confirmed Delivery
**When** a user with manage Deliveries corrects a line's quantity or purchase price, or adds or removes a line
**Then** a correcting Stock Event for the difference is created that references the original, and the balance updates in the same transaction

**Given** the original Delivery
**When** it has been corrected
**Then** it is never deleted or overwritten, and the Delivery view shows the original and every correction

**And** both the original and the correction appear in the Audit Log

### Story 8.5: Purchase price visibility and history

As an Owner,
I want purchase prices kept per Delivery and hidden from Cashiers,
So that margins stay private and profit reports can be added later.

**Requirements:** FR-9, FR-11

**Acceptance Criteria:**

**Given** a user whose Role includes manage Products or manage Deliveries, on a Registered Device
**When** they open a Product
**Then** they see its purchase price history per Delivery (date, supplier, price per Unit)

**Given** any other user, or any user on an unregistered device
**When** they view Products, Deliveries or any API response
**Then** purchase prices are not included

**Given** a Counter
**When** it downloads the catalog
**Then** no purchase price is ever sent to it

## Epic 9: Returns with approval

A Cashier requests a Return; an Approver accepts or rejects it at the Counter (including offline) or on a Registered Device, choosing restock or damaged; refunds count in the right Shift. Nothing changes until a Return is accepted.

### Story 9.1: Request a Return at the Counter

As a Cashier,
I want to start a Return request for items a customer brings back,
So that an Approver can decide while I keep serving the queue.

**Requirements:** FR-3, FR-8, AD-8

**Acceptance Criteria:**

**Given** a Cashier with request Return in an open Shift
**When** they scan or type the Barcodes of the returned Units, choose refund method (cash or card) and optionally suggest restock or damaged
**Then** a pending Return is saved on the Counter with a client-generated ID, Cashier, Counter, Branch and time, online or offline

**Given** the returned Units
**When** the request is created
**Then** the refund amount is each Unit's current price at that Counter (the price it is selling at now), and nobody can type an amount

**Given** a pending Return
**When** it is saved
**Then** it changes no stock, no Sales total and no Shift cash figure

**Given** a pending Return the Cashier created
**When** they cancel it
**Then** it is marked cancelled and changes nothing

**Given** a pending Return stored on the Counter
**When** it is saved
**Then** it is encrypted at rest like unsynced Sales (Story 7.1)

**And** the Cashier can keep selling while Returns are pending, and requests sync like Sales (Story 4.9)

### Story 9.2: Approve or reject a Return at the Counter

As a Manager,
I want to decide on a Return at the till with my own login,
So that the customer is handled on the spot, even during an outage.

**Requirements:** FR-3, FR-24, AD-8

**Acceptance Criteria:**

**Given** pending Returns on a Counter
**When** a user with approve Return enters their own Staff ID and PIN there (offline login works, Story 7.2)
**Then** they see the pending Returns of that Counter without ending the Cashier's session

**Given** a pending Return
**When** the Approver accepts it and chooses restock or damaged
**Then** it is marked accepted with Approver and time, and the Counter tells the Cashier to hand over the refund

**Given** a pending Return
**When** the Approver rejects it with a reason
**Then** it is marked rejected and changes nothing

**Given** a Return the Approver requested themselves
**When** they try to decide it
**Then** it is refused

**Given** an accepted cash refund
**When** it is accepted
**Then** it counts in the Shift open on that Counter at that moment, and closed Shifts are never recomputed

**And** decisions made offline take effect when they sync

### Story 9.3: Approve or reject a Return on a Registered Device

As a Manager,
I want to see and decide pending Returns from the back office,
So that I do not have to walk to the till for each one.

**Requirements:** FR-24, AD-8

**Acceptance Criteria:**

**Given** a user with approve Return on a Registered Device of the Branch
**When** they open pending Returns
**Then** they see every synced pending Return of the Branch with Cashier, Counter, items, amount, suggestion and age

**Given** a pending Return
**When** they accept (with restock or damaged) or reject (with a reason) it
**Then** the decision is saved and sent to the Counter within seconds, which then tells the Cashier to hand over the refund or that it was rejected

**Given** a Return decided at the Counter offline and also decided in the back office
**When** both reach the server
**Then** the Counter's decision wins, because it reflects what happened at the till; the back-office decision is overridden and flagged for the Exceptions Report

**Given** a cash refund accepted from the back office
**When** the Counter receives the acceptance
**Then** the refund counts in the Shift open on that Counter at that moment

**And** a user cannot decide their own Return here either

### Story 9.4: Apply accepted Returns in the cloud

As an Owner,
I want accepted Returns to correct sales and stock automatically,
So that figures are right without anyone editing totals.

**Requirements:** FR-24, AD-8, AD-10

**Acceptance Criteria:**

**Given** an accepted Return reaches the server
**When** it is stored
**Then** its amount is deducted from the Branch's Sales totals for the day of acceptance (Branch time zone)

**Given** an accepted restock Return
**When** it is stored
**Then** a Stock Event adds the Units back and the balance updates in the same transaction

**Given** an accepted damaged Return
**When** it is stored
**Then** it adds nothing to sellable stock and is recorded as damaged

**Given** an offline acceptance by an Approver who was disabled or lost approve Return before it reached the server
**When** it is uploaded
**Then** it is still accepted and flagged for the Exceptions Report

**And** every decision is written to the Audit Log and counted per Cashier and per Approver

## Epic 10: Owner dashboard and Exceptions Report

The Owner checks sales across Branches from a phone (read-only), sees low, negative and searchable stock, and reviews every exception the earlier epics record. All screens work at phone width with no editing controls, use the Branch time zone (Mart default zone for Mart-wide views), and load within 3 s for one day's data.

### Story 10.1: Sales dashboard

As an Owner,
I want today's sales across my Branches on my phone,
So that I know how the day is going without calling the Manager.

**Requirements:** FR-18, NFR-10, NFR-11

**Acceptance Criteria:**

**Given** a user with view dashboard
**When** they open the dashboard
**Then** they see today's total sales in the Mart's currency, Sales by Cashier and Sales by payment type, for the Branches their Role covers; the Owner sees all Branches together and can filter to one

**Given** a chosen date range
**When** the user applies it
**Then** the same figures show for that range, with days defined in the Branch time zone (Mart default zone when all Branches are shown)

**Given** accepted Returns
**When** totals are shown
**Then** they reduce the totals for the day they were accepted

**Given** an online Counter completes a Sale
**When** the dashboard is open
**Then** the Sale is reflected within 5 s

**Given** the dashboard
**When** it is shown
**Then** each Counter's last Sync time is visible, so figures from offline Counters are known to be incomplete

**And** the page is readable and usable at phone width and has no editing controls

### Story 10.2: Stock levels and alerts

As an Owner,
I want to see what is low, what is negative, and the stock of any Product,
So that I can reorder in time and spot problems.

**Requirements:** FR-9, FR-18

**Acceptance Criteria:**

**Given** a user with view dashboard or view Exceptions Report, and a Branch
**When** they open stock
**Then** they see a low-stock list (Units at or below the Branch reorder level) and a negative-stock list, from the stock balance (AD-10)

**Given** any Product
**When** the user searches by name or Barcode
**Then** its stock in Units per Branch is shown, within the NFR-10 screen target at 500,000 Products

**And** no purchase price is shown unless the user has manage Products or manage Deliveries on a Registered Device

### Story 10.3: Exceptions Report: stock and cash

As an Owner,
I want stock and cash problems listed in one place,
So that I review exceptions instead of checking everything.

**Requirements:** FR-19

**Acceptance Criteria:**

**Given** a user with view Exceptions Report, a Branch filter and a date range
**When** they open the Exceptions Report
**Then** it lists negative stock, Spot Count differences, Shift cash differences, and stock balance mismatches from the scheduled check (Story 6.5)

**Given** any item in the report
**When** the user opens it
**Then** it links to the underlying records (Spot Count, Shift, Product stock history)

### Story 10.4: Exceptions Report: Returns and Cashier behavior

As an Owner,
I want to see Return and typing patterns per person,
So that I can notice abuse or training needs early.

**Requirements:** FR-19

**Acceptance Criteria:**

**Given** the Exceptions Report
**When** it is opened for a Branch and date range
**Then** it shows damaged Returns; Returns per Cashier and per Approver with accepted, rejected and still-pending counts; typed-in Barcode entries per Cashier; and PIN lockouts per Staff ID and Counter

**Given** a Return pending longer than a set time (30 minutes by default, configurable per Mart; decided 2026-10-13)
**When** the report is opened
**Then** it is listed as long-pending

**And** each item links to its Returns, Sales or login records

### Story 10.5: Exceptions Report: sync and device issues

As an Owner,
I want to see records that need attention because of sync or device problems,
So that nothing unusual passes unnoticed.

**Requirements:** FR-16, FR-19, FR-24

**Acceptance Criteria:**

**Given** the Exceptions Report
**When** it is opened
**Then** it lists parked events with reason (view-only), Sales accepted from revoked devices or deactivated Branches, Returns approved by accounts no longer valid at upload, and conflicting Return decisions (Story 9.3)

**Given** any of these items
**When** the user opens it
**Then** it shows the original record with Counter time, server receive time and the reason it was flagged
