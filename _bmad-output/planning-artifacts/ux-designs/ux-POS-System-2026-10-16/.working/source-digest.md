# UX Source Digest — POS System (2026-10-16)

Sources: PRD `prds/prd-POS-System-2026-10-06/prd.md` (draft, upd. 2026-10-12/13), Architecture `ARCHITECTURE-SPINE.md` (AD-1..AD-12), `epics.md` (Epics 1-10, final), brief + addendum (2026-10-05/06; pre-SaaS, overridden by PRD where they conflict).
Note: epics.md states "No UX design document exists… Screen layout is decided per story." Constraints carried: responsive by width; phone dashboard read-only; Counter keyboard- and scanner-driven. Epic 4 asks for Counter keyboard/focus flows (scan, typed Barcode, payment, Shift open/close, Approver login over a Cashier session) to be sketched and agreed before Story 4.5.

Superseded by PRD (do not design from brief): brief/addendum say Returns need no approval and Cashier marks restock/damaged; single Mart only; "multiple stores" out. PRD: Returns need Approver acceptance (FR-24), multi-tenant SaaS, multiple Branches.

---

## 1. Users / roles (exact glossary names)

| Name | Who / what they do | Key refs |
|---|---|---|
| **Super Admin** | Platform operator. Seeded in DB (email + password; no in-app creation). Creates Marts + Owner, issues one-time setup code, suspends/reactivates Marts, re-issues Owner access after off-system identity check. Sees Mart list only: name, Mart code, status. Never sees sales, stock, staff activity, Audit Log. Actions go to the platform audit log. | FR-25, FR-22, UJ-5, Story 1.2/1.3/1.7/2.10, AD-3 |
| **Owner** | One per Mart (v1). Holds every Permission in every Branch; cannot be edited down. Creates/deactivates Branches (Owner-only), defines Roles, creates staff, registers/revokes devices, Mart settings. Reads dashboard/Exceptions from phone (read-only there). Cannot be PIN-reset by anyone (recovery via recovery code or Super Admin). A partner gets a custom near-Owner Role. | FR-1, FR-26, FR-22, UJ-3, §7.2 |
| **Manager** | Starter Role: every Permission except view dashboard. Receives Deliveries, edits Products/prices, Spot Counts, approves Returns, manages staff, sees Exceptions Report and stock lists (not sales figures). Works at server-room PC (Registered Device). Can reset Cashiers but not another Manager. | FR-1, FR-27, UJ-2, UJ-4 |
| **Cashier** | Starter Role: sell + request Return. Individual login (Staff ID + PIN). Scans, takes cash/card (recorded), prints receipts, requests Returns, opens/closes own Shift. Cannot change prices; never sees purchase prices or stock levels. | FR-4..8, FR-17, UJ-1, UJ-4 |
| **Approver** | Any user whose Role includes approve Return (default Manager and Owner). Accepts/rejects Returns at Counter (own login, works offline) or on own Registered Device. Never approves own Return. Without sell → limited Counter session (decide Returns + close Shifts only). | FR-24, AD-8, Story 4.2/9.2/9.3 |
| **Role** | Owner-defined named set of Permissions; Cashier and Manager are starter Roles (copy/edit). Assigned per Branch. | FR-1 |
| Non-users | Customers (no screen/account), suppliers (no portal). Staff on a non-Registered Device = read-only. | §2.2 |

**Fixed Permission list (exact names, FR-1; "first cut" [ASSUMPTION]):** sell · request Return · approve Return · manage Products · manage Deliveries · manage suppliers · run Spot Counts · close Shifts · view dashboard · view Exceptions Report (also: parked events list, Shifts list, stock lists + stock search) · view Audit Log · manage staff and Roles · reset PINs · manage Branches and devices (Branch create/deactivate stays Owner-only).

Permission rules with UX impact (FR-1, FR-27, AD-5):
- UI must hide/disable actions not allowed; server also rejects (Story 2.4).
- A user with manage staff and Roles can only grant Roles whose Permissions they hold; cannot change own Role. Non-Owners manage only staff in strictly lower Roles ("lower" = strict subset of Permissions in that Branch).
- Mart-wide data (Products, Mart price, suppliers, Roles, Audit Log) editable only if Permission held in every active Branch; otherwise only Branch data (Branch price, reorder level, assigned staff).
- Users see only assigned Branches; Owner sees all (FR-26).
- Purchase prices only shown to manage Products/manage Deliveries users on Registered Devices; never Cashiers, never to Counters (FR-9, Story 8.5).
- One human in two Marts = two separate accounts (UJ-3 edge, AD-4).

Other glossary terms to use verbatim: Mart, Branch, Counter, Registered Device, Staff ID, Activation code, Mart code, Product, generic Product, Barcode, In-store code, Unit, Pack, Carton, Conversion, Sale, Sales Receipt, Delivery, Return (restock / damaged), Stock Event, Spot Count, Shift, Exceptions Report, Audit Log, Sync, parked events.

## 2. Surfaces, form factors, devices, offline

Surfaces (AD-1: Counter and Manager/Owner are separate entry points in one codebase; only Counter may be Electron-wrapped later):
1. **Counter app** — installable web app (PWA-ish, client-routed SPA, React + Vite + MUI 9.1, IndexedDB). Desktop browser on a till PC. USB keyboard-wedge scanner, ESC/POS thermal printer, cash drawer (`CashDrawer` interface, AD-1). Always a Registered Device bound to one Branch. Login asks only Staff ID + PIN (knows its Mart). May later become Electron + SQLite with no UX change (NFR-4, AD-1).
2. **Manager/Owner web app** — desktop browser on Branch server-room PC (Registered Device → can edit) and on any other browser (read-only). Responsive by width; "What a user can do depends on Role and Registered Device, not on whether the screen is a phone" (§4.9).
3. **Owner phone dashboard** — same Manager/Owner web app in a current mobile browser at phone width; phone can never be a Registered Device → read-only, no editing controls (FR-18, FR-2, AD-5). Login: Mart code + Staff ID + password/PIN.
4. **Super Admin area** — separate sign-in (email + password, Story 1.2); Marts list, create, suspend/reactivate, re-issue Owner access. Form factor not stated (assume desktop web).

Stack note: MUI (Material UI) 9.1.x is binding → design system should map onto MUI components.

Hardware: models unknown (PRD Q1, NFR-4 [ASSUMPTION]); needed before Story 4.1. Scanner = USB keyboard-style (types digits + Enter into focused field). No phone-camera scanning in v1 (§7.2). Printer = ESC/POS thermal (receipt width not stated). In-store code labels / code list printed as a "printable page" (Story 3.5) — printer for labels not specified.

Counter screen sizes / touch: not stated. Counter is "keyboard and scanner driven" (epics UX constraint). No mention of touchscreens.

Offline (FR-15, FR-16, AD-7, AD-9):
- Counter works fully offline (Sales, Return requests, approvals, Shift open/close, logins) after ≥1 Sync, for up to 72 h since last successful Sync (elapsed time, clock-change-proof).
- Manager/Owner web app: no offline requirement stated (online only).
- Catalog of ≥500,000 Products held locally; first download paged, resumable, with progress bar; selling blocked until complete (Story 4.3).
- Stock quantities never on Counter; Counter sells at any stock level.

## 3. User journeys (PRD §2.3)

**UJ-1. Nadia sells through an internet outage.** Nadia, Cashier, evening Shift, Counter 2 (Registered Device), logged in. Internet drops 6:10 pm. She keeps scanning Units, takes cash and card, prints Sales Receipts. A small offline indicator shows on screen. A Barcode that won't scan is typed by hand with a quantity. Climax: queue never stops; on reconnect the Counter syncs Sales with no action from her. Resolution: Sales appear on Owner's dashboard, stock updates. Edge: item sold offline took stock below zero → shows in Exceptions Report, not on Nadia's screen.

**UJ-2. Imran receives a milk delivery.** Imran, Manager, Branch server-room PC (Registered Device), logged in as Manager. Supplier truck: five cartons of milk + other goods. Opens new Delivery → picks supplier → searches or scans Product → enters 5 cartons + purchase price → system converts to Units via Conversion and shows result → repeats for other lines → confirms. Climax: stock updates in Units without hand arithmetic. Resolution: Delivery saved, appears in Audit Log. Edge: Product has no Conversion → Imran sets it first, then continues.

**UJ-3. Hamza checks his Branches from his phone.** Hamza, Owner, Mart with two Branches, away from both. Logs in from phone browser; not a Registered Device → everything read-only. Opens dashboard, sees both Branches together, filters to one. Sees Sales by Cashier and payment type, low or negative stock, Returns per Cashier. Climax: one Cashier has unusually high Returns and typed-in Barcodes. Resolution: he speaks to that Branch's Manager; cannot change anything from the phone. Edge: Hamza is also a Cashier at his cousin's Mart — separate account and login, nothing shared.

**UJ-4. Nadia handles a return.** Nadia at Counter; customer returns sealed detergent, another a leaking oil bottle. Imran in back office. Nadia opens Return, scans item, submits Return request suggesting restock (detergent) and damaged (oil). Holds items aside. Imran sees pending Returns on the Counter (enters his own login) or on his own device, inspects, confirms restock for detergent and damaged for oil, accepts both. Climax: only now refunds come off Sales total; detergent back in sellable stock, oil not. Nadia hands over refunds. Resolution: both Returns counted against Nadia and Imran in Exceptions Report. Edge: internet down → Imran approves at Counter with cached login; approval syncs later.

**UJ-5. Sana registers a new Mart.** Sana, Super Admin, logged in with seeded account. Creates Mart, enters Owner name and contact, sends Owner a one-time setup code. Climax: Owner sets a password, adds a first Branch, registers the Branch's first device. Resolution: Mart in Sana's list as active; she sees it exists, never its sales.

## 4. Screens / features implied (by surface)

### 4a. Counter app
- Install / first-run: device registration via setup code / add-device code / recovery code + device name (FR-22, Story 2.6/2.7/2.9); Owner marks device as Counter → Counter code e.g. C1 (Story 4.2).
- First catalog download: progress bar, resumable, "catalog download in progress" blocks selling (Story 4.3).
- Login: Staff ID + PIN only (Story 2.8); first-time activation (activation code → set PIN ≥6 digits) — unclear if done on Counter or elsewhere; offline login with cached PIN, "needs connection" refusal for uncached users (Story 7.2); lockout message after 5 wrong PINs (5 min, doubling) (FR-3, Story 7.3).
- Session types: selling session; limited Approver/close-Shifts session for users without sell (Story 4.2); Approver overlay login over a Cashier session without ending it (Story 9.2).
- Open Shift: enter opening float (whole units, zero allowed); selling blocked until opened; one open Shift per Counter (FR-17, Story 5.1).
- Sell screen / cart: scan → line (name, price, qty, line total) <200 ms; repeat scan increments; pack Barcode adds N Units; change qty / remove line; cart total in Mart currency; no price edit, discount, hold (FR-4, Story 4.5). "Not found" for unknown Barcode.
- Manual Barcode entry: type Barcode + quantity; recorded as typed-in (FR-5, Story 4.6).
- Name search at Counter: NFR-10 requires name search first results <500 ms (implies a search-by-name affordance at Counter; not explicit in Counter stories).
- Payment: cash or card (recorded only; card on separate terminal); confirm → save + receipt number (FR-6, Story 4.7). No change-due calculation mentioned.
- Receipt print, printer error state, reprint last receipt (same number) (FR-7, Story 4.8).
- Return request: scan/type Units, refund method cash/card, optional suggestion restock/damaged; amount auto = current Counter price, not typeable; pending list; cancel own pending; keep selling (FR-8, Story 9.1).
- Approver decision at Counter: list of that Counter's pending Returns; accept (restock/damaged) or reject (reason); self-approval refused; "hand over refund" prompt to Cashier; also receives back-office decisions within seconds and tells Cashier refund/rejected (FR-24, Story 9.2/9.3).
- Close Shift: blind count — enter counted cash first, then show totals by payment type, expected cash, difference (Story 5.2); close a Shift left open by another user with close Shifts (Story 5.3).
- Status chrome: online/offline/syncing indicator; time left before check-in (offline), <24 h warning; Sync failure; unsynced Sales >1 h warning with count + age of oldest; parked events shown as problem; locked state (72 h / suspended Mart / revoked device) (FR-15, FR-16, Story 7.4-7.9).
- Held/pending price changes apply at Shift boundary (invisible to Cashier, but Counter must keep old price mid-Shift) (Story 5.4).

### 4b. Manager/Owner web app (desktop; read-only on unregistered devices/phone)
- Login: Mart code + Staff ID + PIN/password; activation (activation code → set PIN/password); Owner activation with setup code (Story 1.4, 2.3); Owner first login shows recovery code once with "keep offline" instruction; regenerate recovery code (Story 2.9); "access re-issued by Super Admin" notice with time (Story 2.10).
- Mart settings (Owner): currency (default PKR whole units), default time zone, long-pending Return threshold (default 30 min) (Story 1.6).
- Branches: list, create (name, time zone default Asia/Karachi), edit, deactivate (Owner-only); Branch settings: name, time zone, cutover date, nightly stock-check time (default 03:00) (FR-26, Story 1.6). Branch first-device setup code shown on Branch (Story 2.6).
- Devices: list per Branch, generate add-device code (10-min), revoke (from another Registered Device), mark as Counter / Counter code, replacement Counter takeover of old code (FR-2, FR-22, Story 2.7, 4.2, 4.10). Owner's view of Counters: last successful Sync time + unsynced Sale count per Counter (Story 7.5, FR-16).
- Roles: list incl. starter Roles, create/copy/edit with Permission checkboxes from fixed list, name (Story 2.1).
- Staff: list, create (name, optional phone, one or more Branch + Role pairs) → shows Staff ID + 8-digit activation code once (7-day); edit assignments; disable; reset PIN → new activation code (Story 2.2, 2.5).
- Products: search by name/Barcode (paged, active/deactivated filter, <3 s at 500k) (Story 3.2); create/edit/deactivate (name — Urdu allowed, Barcodes, selling price whole units, Conversion: Units per Pack, Packs per Carton, optional at creation) (Story 3.1); duplicate-Barcode error naming holder; multiple Barcodes / generic Products / move Barcode with confirm (Story 3.3); pack Barcodes with Units per scan (Story 3.4); generate in-store code + print labels/code list (name, price, scannable barcode) (Story 3.5); Branch price override + reorder level per Branch (Story 3.6); pending price changes and per-Counter applied status (Story 5.4); purchase price history per Delivery (date, supplier, price per Unit) for authorized users (Story 8.5).
- Product CSV import: template download (`name`, `selling_price`, `units_per_carton`, `units_per_pack`, `barcodes` with `|` and `barcode*units`), upload, background progress while using other screens, invalid rows list (row number + reason, downloadable), result counts (FR-10, Story 3.7).
- Suppliers: list, create/edit (name, contact), deactivate (FR-21, Story 8.1).
- Deliveries: new Delivery (choose active supplier; add lines by scan or search; qty in Cartons/Packs/Units + purchase price for that qty; shows converted Units and price per Unit; block + inline "set Conversion" when missing; per-line Conversion override; sealed label qty vs counted Units with difference; draft on leave; confirm) (FR-11, Story 8.2/8.3); Delivery view with original + all corrections; correct line qty/price, add/remove line (FR-12, Story 8.4).
- Opening stock: on-screen entry (scan/search + qty in Units, notes "Units" even for pack Barcode, re-entry adjusts) (Story 6.1); CSV import (`barcode`, `quantity_units`) with background progress + invalid rows (Story 6.2).
- Spot Count: single Product (system Units, counted, difference, confirm) (Story 6.3); shelf count (multi-line by scan/search, draft resume/discard) (Story 6.4).
- Pending Returns (back office, Registered Device): list with Cashier, Counter, items, amount, suggestion, age; accept (restock/damaged) / reject (reason) (Story 9.3).
- Shifts list (Branch + date): Cashier, Counter, start/end local time, float, cash Sales, cash refunds, expected, counted, difference; Cashier daily totals; read-only (Story 5.5).
- Sales dashboard (view dashboard): today + date range; all Branches together + filter to one (Owner); total, by Cashier, by payment type; Returns reduce totals; per-Counter last Sync time; updates within 5 s; phone width, no editing controls (FR-18, Story 10.1).
- Stock: low-stock list (≤ reorder level), negative-stock list, stock search by name/Barcode → Units per Branch (FR-18, Story 10.2); open to view dashboard OR view Exceptions Report.
- Exceptions Report (Branch filter + date range), sections (FR-19, Stories 10.3-10.5): negative stock; Spot Count differences; Shift cash differences; stock balance mismatches (stored vs recomputed); damaged Returns; Returns per Cashier and per Approver (accepted/rejected/pending counts); long-pending Returns; typed-in Barcodes per Cashier; PIN lockouts per Staff ID and Counter; parked events with reason (view-only, no accept/dismiss); Sales from revoked devices / deactivated Branches; Returns approved by no-longer-valid accounts; conflicting Return decisions. Each item drills into underlying record (shows Counter time, server receive time, reason flagged).
- Audit Log (view Audit Log): filter by date range, user, kind of change; newest first; entries show who, old/new values, when, device; no edit/delete (FR-20, Story 1.5).

### 4c. Super Admin area
- Sign-in (generic error on wrong creds) (Story 1.2).
- Marts list: name, Mart code, status only (FR-25, Story 1.3).
- Create Mart: Mart name, Owner name, Owner contact (all required) → shows Mart code, Owner Staff ID, one-time setup code once (Story 1.3). How code is "sent" is unspecified (shown once; delivery channel not defined).
- Suspend / reactivate Mart (Story 1.7).
- Re-issue Owner access → one-time Owner activation code (Story 2.10).

## 5. UX constraints

- **Performance (NFR-10, 500k Products):** scan→cart line <200 ms (online/offline); name search first results <500 ms; complete Sale→printed receipt <2 s; Manager/Owner screens and one-day reports <3 s; 500k-row import ≤30 min with screen usable. Dashboard reflects online Sales within 5 s; non-price edits reach Counters within 5 s [ASSUMPTION].
- **Responsiveness:** Manager/Owner pages adapt to screen width; same pages on desktop and phone (§4.9). Phone: readable at phone width, no editing controls (FR-18).
- **Read-only:** any non-Registered Device (phone, home PC) gets read-only screens; writes rejected by server (FR-2). Design needs a clear read-only mode for the whole Manager/Owner app, not only the dashboard.
- **Counter input:** keyboard and scanner driven; scanner is keyboard-wedge (focus management critical); codes designed to be easy to type at a Counter (FR-27).
- **Code formats (FR-27):** Mart code 6 chars letters+digits, no 0/O/1/I; Staff ID numeric (e.g. 1001); activation code 8 digits, single use, 7 days; PIN ≥6 digits; add-device code "short", 10 min [ASSUMPTION]; receipt number `C1-000123`; in-store code EAN-13 prefix 20-29.
- **Language (NFR-5):** English UI only; no Urdu UI; Product names may be typed in Urdu text (so Urdu glyphs/RTL text must render in Product names, cart lines, receipts — receipt Urdu printing not addressed).
- **Currency (NFR-5, AD-3):** per-Mart setting; PKR in whole rupees for pilot; no decimals implied. **Tax:** none; receipt shows one total, no tax line.
- **Time zones (NFR-11, AD-12):** stored UTC; Branch time zone (default Asia/Karachi) for "today", Shifts, daily figures, receipt time; Mart default zone for Mart-wide/all-Branch views.
- **Receipt content (FR-7, Story 4.8):** Mart name, Branch name, local date and time, Cashier, lines with quantity and price, total, payment type, unique receipt number. Reprint = same number. Nothing about logo, address, footer, return policy text.
- **Blind cash count** at Shift close (Story 5.2).
- **No-approval-friction counter-metrics:** don't nudge Approvers to approve fast (SM-C4), don't rank Cashiers by speed (SM-C2), don't push Return counts down (SM-C1) — affects dashboard framing.
- **Accessibility:** not mentioned anywhere.
- **Branding / white-label:** not mentioned (product working title unconfirmed: "Cloud POS and Inventory SaaS for Marts — Working title: confirm"). Mart name appears on receipts only.
- **Not in v1 (no UI):** discounts, held carts, price override, void Sale, card processing, stock transfers, phone camera scanning, weighed items, expiry dates, profit/margin reports, billing/plans, multiple Owners, customer display.

## 6. States the UI must show

Counter:
- Online / offline / syncing indicator (FR-15, Story 4.2); "small offline indicator" (UJ-1).
- Offline countdown: time left before must check in; warning <24 h remaining (Cashier + Manager) (FR-15, Story 7.4).
- 72-h limit reached: finish current Sale, then locked — no new logins/Sales until Sync (Story 7.4).
- Sync failure visible (FR-16, Story 4.9).
- Unsynced Sales older than 1 h: warning with count + oldest age (Story 7.5).
- Parked event(s) shown as a problem on the Counter (Story 7.6).
- Catalog download in progress / incomplete → selling blocked (Story 4.3).
- No open Shift → selling blocked; Shift open by another Cashier → must wait (Story 5.1).
- Selling vs limited (Approver/close-Shifts) session; Approver overlay on Cashier session (Story 4.2, 9.2).
- Login errors: wrong PIN, lockout (with remaining time, doubling), "needs connection" (uncached user offline), refused (no sell / other Branch / disabled / revoked device) (Story 7.2, 7.3, 2.8).
- Return states: pending, cancelled, accepted (restock/damaged) → "hand over refund", rejected (with reason); self-approval refused (Story 9.1-9.3).
- Not found (scan/typed Barcode, deactivated Product) (Story 4.4-4.6).
- Printer failure / out of paper error + reprint (Story 4.8).
- Suspended Mart: upload then lock; reactivated → must Sync before selling (Story 7.9, FR-25).
- Revoked device / deactivated Branch: may upload but no login/sell (Story 7.7).
- Restore epoch re-send (background; likely just "syncing") (Story 7.8).
- Negative stock is never shown to Cashier (UJ-1, AD-6).

Manager/Owner/Super Admin:
- Read-only mode on unregistered device (FR-2, Story 2.8).
- "Mart suspended" message on login/requests (Story 1.7).
- Per-Counter last Sync time + unsynced count; dashboard figures possibly incomplete for offline Counters (FR-18, Story 10.1).
- Background job progress (Product import, opening stock import) and results with invalid rows (Story 3.7, 6.2).
- Pending price changes (saved, not yet applied per Counter) (FR-9, Story 5.4).
- Drafts: shelf Spot Count, unconfirmed Delivery (Story 6.4, 8.2).
- Delivery line blocked: no Conversion (FR-11).
- Deactivated: Products, suppliers, Branches (history visible), disabled accounts.
- Negative stock, low stock lists; Exceptions categories (see §4b).
- One-time codes shown once (setup, activation, add-device with 10-min expiry, recovery); expired/used code errors ("ask for a new code") (Story 1.4, 2.3).
- Owner notice: access re-issued by Super Admin (Story 2.10).
- Long-pending Return (>30 min default) flag (FR-19).
- Parked events: view-only, no actions (FR-16).
- Permission-hidden/disabled actions (Story 2.4).

## 7. Open questions relevant to UX

From PRD §9 / epics:
1. Scanner, printer, PC (and cash drawer) models unknown → Counter screen size, receipt width (58 vs 80 mm), print method (Q1; needed for Story 4.1).
2. Old app data format unknown (Q2) → affects import UX only indirectly.
3. Expiry dates needed for milk etc.? (Q3; settle before Epic 8 — would add a Delivery line field).
4. SM-2 baseline Delivery-entry time and SM-3 accuracy target not measured (Q4).
5. Internet reliability at pilot unconfirmed (Q5) → how prominent offline states should be.
6. Loose/weighed items truly never sold? (Q6).
7. Later Marts' tax, currency, language (Q7) → settings model.
8. Billing / plan limits timing (Q8) → Super Admin UI growth.
Gaps found while reading (not answered in sources):
- Permission list is an [ASSUMPTION] "first cut, to be refined in UX and architecture" (FR-1) — UX is invited to refine.
- Where staff first activate (Counter vs web) and how a Counter-only Cashier sets PIN — unspecified.
- How the Owner's setup code is "sent" by Super Admin (shown once; no email/SMS channel defined).
- Name search at the Counter: performance target exists (NFR-10) but no Counter story for search-by-name UI.
- Change-due / cash tendered at payment: not specified.
- Return reject reasons: free text or list? Unspecified.
- Approver overlay interaction at Counter, keyboard/focus flows: explicitly left to a pre-Story-4.5 sketch.
- Accessibility, branding/white-label, product name, logo, dark mode, receipt header/footer: nothing stated.
- Counter screen size, touch vs mouse: nothing stated beyond "keyboard and scanner driven".
- Branch switcher behavior for multi-Branch non-Owner users: implied, not specified.
- Notifications/alerts (push, SMS) for Owner: none in v1; long-pending/exceptions are report-only.
- Brief/addendum predate SaaS + approval rule; use PRD.
