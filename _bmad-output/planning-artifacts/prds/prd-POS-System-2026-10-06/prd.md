---
title: "PRD: Cloud POS and Inventory SaaS for Marts"
status: draft
created: 2026-10-06
updated: 2026-10-12
---

# PRD: Cloud POS and Inventory SaaS for Marts
*Working title: confirm.*

## 0. Document Purpose

This PRD defines version 1 of a cloud point-of-sale and inventory product sold as software as a service (SaaS) to Marts. It is written for the product owner, who makes the decisions, and for the downstream UX, architecture and epic-writing work. It builds on the forged idea and the product brief in `_bmad-output/` (`forge/cloud-mobile-first-pos/forged-idea.md` and `planning-artifacts/briefs/brief-POS-System-2026-10-05/`), which describe the first customer (the pilot Mart). Those inputs predate the SaaS scope and the Return approval rule below, which override them. Vocabulary is anchored in the Glossary (§3). Features group their requirements, which are numbered globally (FR-1 to FR-N). FR numbers are stable IDs and are not sequential. Inferred details carry an inline `[ASSUMPTION]` tag and are indexed in §10. Open items are in §9. Status: draft; see the Changelog (§12).

**v1 at a glance:** a cloud POS and inventory SaaS for Marts. A Super Admin registers Marts; an Owner runs Branches, Roles and staff; Cashiers sell at Counters that keep selling offline (for up to 72 hours between Syncs); Returns need Approver acceptance; Managers receive Deliveries and count stock; the Owner reads sales and exceptions from a phone. Not in v1: billing, stock transfers between Branches, card processing, tax, and remote stock editing. Full scope is in §7.

## 1. Vision

A Mart runs everything from one desktop in a server room. Stock and sales history live on a single hard drive, the Manager types every supplier Delivery by hand, and nobody outside the room can see the numbers. This product replaces that with a cloud-hosted responsive web app: Counters sell and print Sales Receipts, the Manager receives and counts stock, and the Owner checks sales from a phone.

The hard requirement is that **a Counter never stops selling**, including when the internet is down. Stock is derived from events (received minus sold), so Sales at different Counters never conflict. Mismatches become a short Exceptions Report for the Owner to review, not a conflict to resolve.

It is a multi-tenant SaaS product. A Super Admin registers Marts and their Owners. An Owner runs one or more Branches and defines Roles and Permissions for staff in each Branch. Inside a Branch, everything in this PRD about Counters, Returns, Deliveries and stock applies. The Mart this work started with is the pilot customer.

## 2. Target User

### 2.1 Jobs To Be Done
- **Super Admin:** onboard a new Mart and its Owner quickly, and switch a Mart off when needed, without seeing the Mart's business data.
- **Owner:** run several Branches, control who can do what in each, and know sales, stock problems and exceptions from a phone.
- **Cashier:** scan items quickly, take payment, print the Sales Receipt, and start a Return without losing the queue.
- **Approver (Manager or Owner):** accept or reject Returns quickly, and turn a supplier Delivery in cartons and packs into correct Unit stock with little typing.
- **Owner (data safety):** stop depending on one hard drive.

### 2.2 Non-Users (v1)
- Customers (no customer-facing screen or account).
- Suppliers (no supplier portal).
- The Super Admin does not use a Mart's Counters or see its sales and stock.
- Staff on a device that is not a Registered Device of their Branch. They get read-only access.

### 2.3 Key User Journeys

- **UJ-1. Nadia sells through an internet outage.**
  - **Persona + context:** Nadia, a Cashier on the evening Shift at Counter 2.
  - **Entry state:** logged in on the Counter, which is a Registered Device. The internet drops at 6:10 pm.
  - **Path:** she keeps scanning Units, takes cash and card payments, and prints Sales Receipts. A small offline indicator shows on screen. A Barcode that won't scan is typed in by hand with a quantity.
  - **Climax:** the queue never stops. When the connection returns the Counter syncs its Sales without her doing anything.
  - **Resolution:** Sales appear in the Owner's dashboard and stock updates.
  - **Edge case:** an item sold offline took stock below zero. It shows in the Exceptions Report, not on Nadia's screen.

- **UJ-2. Imran receives a milk delivery.**
  - **Persona + context:** Imran, the Manager, at the Branch's server-room PC (Registered Device).
  - **Entry state:** logged in as Manager. A supplier truck has arrived with five cartons of milk and other goods.
  - **Path:** he opens a new Delivery, picks the supplier, searches or scans the Product, enters 5 cartons and the purchase price. The system converts to Units using the Product's Conversion and shows the result. He repeats for other lines and confirms.
  - **Climax:** stock updates in Units without hand arithmetic.
  - **Resolution:** the Delivery is saved and appears in the Audit Log.
  - **Edge case:** a Product has no Conversion set. Imran sets it first, then continues.

- **UJ-3. Hamza checks his Branches from his phone.**
  - **Persona + context:** Hamza, the Owner of a Mart with two Branches, away from both.
  - **Entry state:** logs in from his phone browser. The phone is not a Registered Device, so everything is read-only.
  - **Path:** he opens the dashboard, sees both Branches together, then filters to one. He sees Sales by Cashier and payment type, low or negative stock, and Returns per Cashier.
  - **Climax:** he sees that one Cashier has an unusually high number of Returns and typed-in Barcodes.
  - **Resolution:** he speaks to the Manager at that Branch. He cannot change anything from the phone.
  - **Edge case:** Hamza is also a Cashier at his cousin's Mart. He has a separate account and login there, and nothing is shared between the two.

- **UJ-4. Nadia handles a return.**
  - **Persona + context:** Nadia at the Counter; a customer returns a sealed packet of detergent, and another returns a leaking oil bottle. Imran, the Manager, is in the back office.
  - **Path:** Nadia opens Return, scans the item and submits a Return request, suggesting restock for the first and damaged for the second. She holds each item aside. Imran sees the pending Returns on the Counter (he enters his own login) or on his own device, inspects the items, confirms restock for the detergent and damaged for the oil, and accepts both.
  - **Climax:** only now do the refunds come off the Sales total, the detergent goes back into sellable stock, and the oil bottle does not. Nadia hands over the refunds.
  - **Resolution:** both Returns are counted against Nadia and against Imran in the Exceptions Report.
  - **Edge case:** the internet is down. Imran approves at the Counter with his cached login, and the approval syncs later.

- **UJ-5. Sana registers a new Mart.**
  - **Persona + context:** Sana, the Super Admin of the platform.
  - **Entry state:** logged in with a Super Admin account that was seeded in the database.
  - **Path:** she creates the Mart, enters the Owner's name and contact, and sends the Owner a one-time setup code.
  - **Climax:** the Owner sets a password, adds a first Branch, and registers the Branch's first device.
  - **Resolution:** the Mart appears in Sana's list as active. She can see that it exists, never its sales.

## 3. Glossary

- **Super Admin** — a platform operator who registers and suspends Marts and Owners. Seeded in the database. Cannot see any Mart's sales, stock or staff activity.
- **Mart** — a customer business and the tenant that owns all its data. Has one Owner account and one or more Branches.
- **Branch** — one shop location of a Mart. Has its own stock, Counters, Registered Devices, Shifts and staff assignments.
- **Counter** — a till computer at a Branch where Cashiers sell. Always a Registered Device. Has a USB scanner and thermal printer.
- **Registered Device** — a machine the Owner has registered to a Branch (see FR-2).
- **Staff ID** — a short ID the system generates for each staff account, unique within a Mart. Not a secret.
- **Activation code** — a one-time code the system shows when staff are created or reset. The staff member enters it once to set their own PIN or password.
- **Owner** — the account that owns a Mart (one Owner per Mart in v1). Has every Permission for every Branch of that Mart, and manages its Branches, Roles, staff and devices.
- **Role** — a named set of Permissions defined by the Owner. Cashier and Manager exist as starter Roles the Owner can copy or change.
- **Permission** — one allowed action from a fixed list (see FR-1).
- **Cashier** — a user whose Role lets them sell and request Returns. Individual login.
- **Manager** — a user whose Role lets them run the Branch: receive Deliveries, edit Products and prices, run Spot Counts, approve Returns, manage staff and see the Exceptions Report. The starter Manager Role has every Permission except view dashboard.
- **Approver** — a user whose Role includes approving Returns (by default Manager and Owner).
- **Product** — the thing the Mart prices and counts: a name, one or more Barcodes, a selling price and a Conversion. Mart-wide. A Product is either a specific item (Coca-Cola 1.5L) or a **generic Product** that groups several brands sold at one price (Bottle 1.5L), as the Owner chooses (FR-28).
- **Barcode** — a code that identifies one Product when scanned. Usually the manufacturer's printed code; a Product can have many Barcodes, but each Barcode belongs to exactly one Product in a Mart. A Barcode identifies either one Unit or a Pack/Carton of a set number of Units.
- **In-store code** — a Barcode the system generates for an item with no printed barcode, from the range reserved for in-store use (EAN-13 starting 20–29).
- **Unit** — one single sellable item. All stock is held in Units, per Branch.
- **Pack** / **Carton** — larger supplier groupings of Units. A Pack or Carton scans at the Counter only if its Barcode is set up as a pack Barcode (FR-28).
- **Conversion** — per-Product rule: Units per Pack, Packs per Carton.
- **Sale** — a completed transaction at a Counter: one or more Units, a payment type, a Cashier and a Counter.
- **Sales Receipt** — the printed document given to the customer for a Sale.
- **Delivery** — a supplier delivery entered by the Manager (supplier, Products, quantities, purchase prices). Called a Delivery to avoid confusion with the Sales Receipt.
- **Return** — a customer returning a sold Unit. It starts as a pending request by a Cashier and becomes final only when an Approver accepts it, marked **restock** or **damaged**.
- **Stock Event** — an additive record changing a Branch's stock: Delivery (and its corrections), Sale, accepted restock Return, opening stock count, or Spot Count correction.
- **Spot Count** — the Manager counting a Product on the shelf and recording the quantity against the system's stock.
- **Shift** — one Cashier's working period at a Counter, from login to closing.
- **Exceptions Report** — the list of anomalies the Owner reviews (see FR-19).
- **Audit Log** — the record of who changed which stock, price or user, and when.
- **Sync** — a Counter sending its stored Sales and Returns data and receiving updated Products and prices after being offline.

## 4. Features

### 4.1 Authentication, Roles, Permissions and Registered Devices

**Description:** Every person has an individual login. Each login belongs to exactly one Mart. A human who works in two Marts (for example Owner of one and Cashier in another) has two separate accounts, and nothing is shared between them. Within the Mart, the account is assigned a Role per Branch. Device registration is a second check: the server refuses selling logins and all write actions from any device that is not a Registered Device of that Branch. Editing from the Owner's home PC or phone is not allowed in v1. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-1: Accounts, Roles and Permissions
The Owner can create staff accounts (name, optional phone number, Branch and Role), disable them, define Roles by choosing Permissions from a fixed list, and assign each user a Role per Branch. Cashier and Manager ship as starter Roles: Cashier has sell and request Return; Manager has every Permission except view dashboard. Decided by the product owner on 2026-10-13.

**Permission list** (fixed; these names are used throughout this PRD). `[ASSUMPTION]` first cut, to be refined in UX and architecture.

| Permission | Allows |
| --- | --- |
| sell | complete Sales at a Counter |
| request Return | start a Return request |
| approve Return | accept or reject Returns |
| manage Products | create and edit Products, prices and Branch prices, bulk import |
| manage Deliveries | enter and correct Deliveries |
| manage suppliers | create, edit and deactivate suppliers |
| run Spot Counts | Spot Counts and the opening stock count |
| close Shifts | close another user's open Shift |
| view dashboard | the sales dashboard (FR-18) |
| view Exceptions Report | the Exceptions Report (FR-19), the parked events list, the Shifts list, and the stock lists and stock search of FR-18 |
| view Audit Log | search the Mart's Audit Log |
| manage staff and Roles | create accounts and define Roles |
| reset PINs | reset users of a lower Role |
| manage Branches and devices | edit Branch settings and manage Registered Devices (creating and deactivating Branches stays with the Owner) |

**Consequences (testable):**
- A user can only open screens and perform actions their Role allows in that Branch, and the server rejects other actions if called directly.
- A user can never approve their own Return, whatever their Role.
- The Owner holds every Permission in every Branch and cannot be edited down.
- A user with manage staff and Roles can create, edit or assign only Roles whose Permissions they hold themselves, and cannot change their own Role. This stops a Manager from granting anyone, including themselves, view dashboard.
- Permission scope: Roles are assigned per Branch, but some data is Mart-wide (Products and the Mart price, suppliers, Roles, the Audit Log). A Permission acts on Mart-wide data only if the user holds it in every active Branch of the Mart. Otherwise it acts only on the data of the Branches where they hold it (for example Branch prices and reorder levels, staff assigned to those Branches). Decided by the product owner on 2026-10-13.
- A non-Owner with manage staff and Roles can create, disable and reassign only staff whose Role is lower than theirs (same rule as PIN resets, FR-27). Decided by the product owner on 2026-10-13.
- A disabled account cannot log in on any online device. An offline Counter may still accept that account until its next Sync, but never longer than the offline limit in FR-15. After that, the account is refused.
- Accounts never carry across Marts. A suspended Mart blocks only its own accounts.
- Every account, Role and assignment change is written to the Mart's Audit Log.

#### FR-27: Staff login, activation and PIN reset
Staff activate their own account, log in with their own PIN or password, and can have it reset when forgotten.

**Consequences (testable):**
- Creating a staff account generates a Staff ID and shows a one-time activation code to the Owner. Names and phone numbers need not be unique.
- The staff member enters the activation code at first login and sets their own PIN or password. The code then stops working. No one else ever sees the PIN or password.
- A user logs in with Mart, Staff ID and PIN or password. A Counter is registered to a Branch, so it already knows the Mart and asks only for Staff ID and PIN. On a phone the user also enters the Mart code.
- Formats, chosen to be easy to type at a Counter: the Mart code is 6 characters of letters and digits with look-alikes left out (no 0, O, 1 or I); the Staff ID is a number (for example 1001), unique within the Mart; the activation code is 8 digits, works once and expires after 7 days; a PIN is at least 6 digits. Decided by the product owner on 2026-10-12.
- A staff member who forgets their PIN asks the Owner or a user with the reset PINs Permission. That person generates a new activation code, and the old PIN stops working at once. The staff member then sets a new PIN.
- The Owner can reset anyone. A user with the reset PINs Permission can reset only users with a lower Role, never an equal or higher one. A Role is lower when its Permissions in that Branch are a strict subset of the resetter's. Nobody can reset the Owner (Owner recovery is in FR-22). With the starter Roles, a Manager can reset Cashiers but not another Manager.
- Every reset is written to the Audit Log and shows who reset whom.

#### FR-2: Registered Devices
The Owner can register and revoke Registered Devices for a Branch. The server checks the device on every login and every write request.

**Consequences (testable):**
- A user whose Role includes selling, on an unregistered device or on a device registered to another Branch, is refused and no session is created.
- Any user on an unregistered device sees read-only screens and every write is rejected by the server.
- Revoking a device invalidates its sessions on its next contact with the server. The Owner can revoke a lost or stolen Counter from any other Registered Device.
- Registration and revocation are written to the Audit Log.

**Out of Scope:** registering home PCs or phones as editing devices.

#### FR-3: Offline login at Counters
A user can log in at a Counter while the internet is down, and an Approver can approve Returns there.

**Consequences (testable):**
- Credentials needed for offline login are stored on the Counter in hashed form only, using a slow password hash.
- After 5 wrong PINs, that Staff ID is locked on that Counter for 5 minutes, and the lock doubles each time it repeats. The lock applies online and offline. Failed attempts and locks are logged and shown in the Exceptions Report.
- Only accounts that were active at the last Sync can log in offline, and only those assigned to that Counter's Branch.
- Cached credentials, the device token and unsynced Sales stored on a Counter are encrypted at rest.
- The local Product catalog (Barcode, name, price, Conversion) is held for offline scanning and is not encrypted at rest. It is not secret and is very large. Decided by the product owner on 2026-10-07.

#### FR-22: Device provisioning and recovery
The Owner can register a Branch's first device, add further devices, and recover when devices are lost.

**Consequences (testable):**
- When a Branch is created, the Owner gets a one-time setup code that registers the Branch's first device. The code works once and expires.
- To add a device, the Owner on a Registered Device generates a short one-time code, which is typed on the new machine at the Branch within 10 minutes. `[ASSUMPTION]` The server then issues that machine a secret token.
- A password alone can never register a device.
- A recovery code, generated for the Owner when the Mart is registered and kept offline, can register a new device if every Registered Device of a Branch is lost.
- If a Branch's server-room PC dies, the Owner registers a replacement from another Registered Device and revokes the dead one.
- A replacement Counter downloads the full Product catalog from the cloud (FR-16), with a progress bar. There is no copying from another Counter over the local network.
- If the Owner loses both the password and the recovery code, the Owner contacts the Super Admin, who checks identity outside the system (for example national ID card and the registered phone number, by a call) and issues a one-time Owner activation code. This resets the Owner's credentials only; it gives the Super Admin no access to Mart data. It is recorded in the platform audit log and in the Mart's Audit Log, and the Owner sees a notice at the next login. Decided by the product owner on 2026-10-12.

### 4.2 Counter Sale

**Description:** The Cashier scans single Units with a USB scanner and the cart builds up. Every Product on display is registered. If a Barcode is damaged, the Cashier types its number and a quantity so the customer keeps the item. Selling is never blocked by stock level. Realizes UJ-1.

**Functional Requirements:**

#### FR-4: Build a cart by scanning
A Cashier can add Units to a cart by scanning a Barcode. Scanning the same Barcode again increases the quantity.

**Consequences (testable):**
- The cart shows each line's name, price, quantity and line total, and the cart total in the Mart's currency.
- The Cashier can change a line's quantity or remove a line before payment.
- The Cashier cannot change a price at the Counter. `[ASSUMPTION]` No discounts, no held carts, no manual price override in v1.

#### FR-5: Manual Barcode entry
A Cashier can type a Barcode number and then a quantity to add a Product when the Barcode will not scan.

**Consequences (testable):**
- A typed-in entry adds the same Product line as a scan would, for any kind of Barcode (Unit, pack or in-store code).
- Each typed-in entry is recorded against the Cashier and the Counter, and counted for the Exceptions Report.
- An unknown Barcode shows a "not found" error and adds nothing to the cart.

**Out of Scope:** selling unregistered or free-text items; weighed or loose items.

#### FR-6: Complete a Sale with payment
A Cashier can complete a Sale by choosing cash or card. Payment is recorded only; card payments are taken on a separate terminal.

**Consequences (testable):**
- A completed Sale records Cashier, Counter, Branch, time, lines, total and payment type, and creates one Stock Event per line.
- A Sale completes and prints even if it takes any Product's stock below zero.
- A completed Sale cannot be edited. Corrections go through a Return.

#### FR-7: Sales Receipt printing
The Counter prints a Sales Receipt on a thermal printer after each Sale.

**Consequences (testable):**
- The Sales Receipt shows: Mart name, Branch name, date and time, Cashier, lines with quantity and price, total, payment type, and a unique receipt number.
- A Cashier can reprint the last Sales Receipt, and the reprint carries the same receipt number.
- If the printer fails, the Sale is still saved, and the Cashier can reprint.

#### FR-23: Receipt numbering
Each Sales Receipt gets a number that is unique across all Counters of a Mart, including Sales made offline.

**Consequences (testable):**
- Each Counter has a fixed code and its own running count (for example `C1-000123`), created without internet. Codes are unique within the Mart.
- A replacement Counter machine takes over the old Counter's code and continues numbering from the last number the cloud saw plus a safe gap of 10,000, so a restore from backup or late uploads from the old machine cannot repeat a number. The gap exceeds what one Counter can issue within the 72-hour offline limit. Decided by the product owner on 2026-10-13.

**Feature-specific NFRs:**
- Performance targets for the Counter are set in NFR-10.

### 4.3 Returns

**Description:** A Cashier starts a Return at the Counter as a request. Nothing changes until an Approver accepts it: only then is the Return final, the amount taken off the Sales total, and (for restock) the stock restored. The Mart teaches its return policy in person or on paper; the Approver applies it. Realizes UJ-4.

**Functional Requirements:**

#### FR-8: Request a Return
A Cashier can submit a Return request for one or more Units by scanning (or typing) the Barcode, choosing the refund method (cash or card, recorded only), and optionally suggesting restock or damaged.

**Consequences (testable):**
- The refund amount is the price each returned Unit is selling at on that Counter when the request is made. While a new price is held until the next Shift boundary (FR-9), this is the old price, the one the customer most likely paid. Nobody types an amount. Decided by the product owner on 2026-10-13.
- A new Return is pending. It changes no stock, no Sales total and no Shift cash figure.
- Every Return request records Cashier, Counter, Branch and time, and is counted per Cashier for the Exceptions Report.
- The Cashier can cancel a pending request they created.
- A Cashier can keep selling while Returns are pending.

**Out of Scope:** matching a Return to its original Sale; return-window enforcement.

#### FR-24: Approve or reject a Return
An Approver can accept or reject a pending Return, choosing restock or damaged when accepting.

**Consequences (testable):**
- An Approver sees the Branch's pending Returns on a Counter (after entering their own credentials there) or on any Registered Device they can log in on.
- Accepting a Return marks it accepted, deducts its amount from the Branch's Sales totals, and (restock only) adds the Units to sellable stock through a Stock Event. A damaged Return adds nothing to sellable stock and is recorded as damaged.
- Rejecting a Return records the rejection and its reason, and changes no stock or totals.
- The approver's name, the decision and the time are written to the Audit Log and counted per Approver in the Exceptions Report.
- A user cannot approve their own Return.
- Approval works at a Counter while offline using the Approver's cached login. The decision syncs later and takes effect on Sync.
- An Approver whose Role lacks sell can still log in at a Counter, in a session limited to deciding Returns and closing Shifts.
- If the same Return is decided both at the Counter and on another device, the Counter's decision wins, because it reflects what happened at the till (a refund handed over or refused). The other decision is overridden and flagged in the Exceptions Report. Decided by the product owner on 2026-10-13.
- If the Approver's account was disabled, or lost the approve Return Permission, before the approval reached the server, the Return is still accepted (the refund was already handed over) and is flagged in the Exceptions Report as approved by an account that was no longer valid.
- A Cashier hands over the refund only after acceptance. Accepted cash refunds count in the Shift that is open on that Counter when the Return is accepted. A closed Shift is never recomputed.

### 4.4 Products and Pricing

**Description:** The Manager maintains Products on a Registered Device, and the cloud copy always wins. The Product list is shared across a Mart's Branches; price can differ by Branch. All Barcodes on display are registered before go-live.

**Functional Requirements:**

#### FR-9: Manage Products
A user with the manage Products Permission can create and edit a Product (name, Barcodes, selling price, Conversion) and deactivate it, and can set an optional price for a single Branch.

**Consequences (testable):**
- Barcode rules are set in FR-28.
- A Branch's price override, when set, replaces the Mart price at that Branch only.
- Each Product has a reorder level per Branch. `[ASSUMPTION]` Default is none until set.
- Product edits other than price (new Products, names, Barcodes, Conversions, deactivation) show on an online Counter within seconds, and on an offline Counter after its next Sync (FR-16).
- A new price, Mart-wide or for one Branch, is saved at once but applies at Counters only at the next Shift boundary: when a Shift is closed or a new Shift is opened. No Sale is made at a new price in the middle of a Shift. `[ASSUMPTION]` Shift open and close are the "start and end of day" moments.
- The user can see which price changes are saved and still waiting to apply.
- Every edit is written to the Audit Log with old and new values.
- Purchase prices are shown only to users whose Role includes managing Products or Deliveries, on Registered Devices, never to Cashiers.

#### FR-10: Bulk import of Products
A user with the manage Products Permission can import Products in bulk from a file. `[ASSUMPTION]` CSV.

**Consequences (testable):**
- Invalid rows are listed with the reason and are not imported; valid rows are. A row whose Barcode already belongs to another Product is invalid.
- A row can give several Barcodes for one Product, including pack Barcodes with their Unit quantity.
- A file of 500,000 rows imports in the background with progress shown, within the target in NFR-10, and the screen stays usable. `[ASSUMPTION]` CSV.

**Notes:** the pilot Mart's old app data format is unknown (§9). The import is for Products; opening stock has its own import (FR-14); migration of history is not in v1.

#### FR-28: Barcodes, generic Products and in-store codes
A user with the manage Products Permission decides, per item, how Barcodes map to Products.

**Consequences (testable):**
- A Product can have many Barcodes. Each Barcode belongs to exactly one Product in the Mart, so a scan always gives one result with no choice to make.
- **Specific item** (the default): one Product per item, with its printed Barcode (Coca-Cola 1.5L and Sprite 1.5L are two Products).
- **Generic Product**: one Product with the printed Barcodes of several brands linked to it (Bottle 1.5L with the Coca-Cola, Sprite and Fanta 1.5L Barcodes). Scanning any of them adds Bottle 1.5L. Price, stock, Deliveries, Spot Counts and reports are per generic Product, so stock per brand is not known.
- All Barcodes of a Product sell at that Product's one price. If one brand needs a different price, it is moved to its own Product.
- **Pack Barcode**: a Barcode can be set to mean a set number of Units of its Product (a carton of 6 scans as 6 Units). Stock is always counted in Units.
- **In-store code**: for an item with no printed barcode, the system generates a code from the in-store range (EAN-13 starting 20–29), unique within the Mart, and can print it as a label or show it on a code list for the Counter.
- Moving a Barcode to another Product is written to the Audit Log. Scans from then on go to the new Product. Stock already recorded stays with the old Product until a Spot Count corrects it.
- Barcode changes reach Counters like other non-price Product edits (FR-9).

**Notes:** grouping fits items sold at the same price whose brand-level stock does not matter (chips in several flavours, small sweets). Keep items separate when suppliers or prices differ, because Deliveries and reordering are by supplier. Decided by the product owner on 2026-10-12.

### 4.5 Receiving Deliveries

**Description:** The Manager enters a supplier Delivery in cartons or packs, with purchase prices, and the system converts to Units using each Product's Conversion. A Delivery adds stock to its Branch. Realizes UJ-2.

**Functional Requirements:**

#### FR-11: Enter a Delivery
A user with the manage Deliveries Permission can create a Delivery: choose a supplier, add lines (Product, quantity as Cartons, Packs or Units, purchase price), and confirm.

**Consequences (testable):**
- The system shows the Unit quantity for each line before confirming, using the Product's Conversion.
- Confirming creates one Stock Event per line and records the supplier and purchase price per line.
- A line for a Product with no Conversion set is blocked with a message to set it first.
- The user can override the Conversion on a Delivery line when a supplier's Pack size differs (for example a different Units-per-Pack); the override applies to that line only and is recorded.
- Sealed Cartons are accepted at the supplier's label quantity; the user may enter a counted quantity instead, and a difference is recorded on the line.
- Each purchase price is kept per Delivery, so history per Product is available later. Profit and margin reports are not in v1.
- Deliveries are written to the Audit Log.

#### FR-12: Correct a Delivery
A user with the manage Deliveries Permission can correct a confirmed Delivery.

**Consequences (testable):**
- A correction is a new Stock Event that references the original; the original is not deleted.
- Both appear in the Audit Log.

#### FR-21: Manage suppliers
A user with the manage suppliers Permission can create, edit and deactivate suppliers (name, contact details). Suppliers are Mart-wide.

**Consequences (testable):**
- A Delivery requires an active supplier.
- Supplier changes are written to the Audit Log.

**Out of Scope:** supplier payments, purchase orders and supplier balances.

### 4.6 Stock Accuracy and Spot Counts

**Description:** Stock per Product per Branch, in Units, is the sum of its Stock Events: opening stock count, plus Deliveries and their corrections, minus Sales, plus accepted restock Returns, plus or minus Spot Count corrections. Negative stock is allowed and surfaces as an exception. Users run Spot Counts to compare the system with the shelf.

**Functional Requirements:**

#### FR-13: Spot Count
A user with the run Spot Counts Permission can pick a Product (or a shelf's Products), enter the counted Units, and see the difference from system stock.

**Consequences (testable):**
- Confirming the count records the difference and creates a correcting Stock Event.
- Every Spot Count is written to the Audit Log with the system quantity, counted quantity and the user.
- Spot Count differences appear in the Exceptions Report.

#### FR-14: Opening stock count
The Owner or a user with the run Spot Counts Permission can enter an opening stock count for every Product at a Branch at cutover.

**Consequences (testable):**
- The opening count is recorded as Stock Events dated at cutover.
- The opening count can be typed in on screen (scan or search, then quantity) or imported per Branch from a CSV file (Barcode, quantity in Units). The import runs in the background like FR-10, lists invalid rows with the reason, and is written to the Audit Log. Decided by the product owner on 2026-10-12.
- `[ASSUMPTION]` One full physical count per Branch is required before go-live.

### 4.7 Offline Operation and Sync

**Description:** Counters work with no internet for up to 72 hours and Sync afterwards (limit defined in FR-15). Sales are additive Stock Events, so Counters never conflict. Realizes UJ-1.

**Functional Requirements:**

#### FR-15: Offline selling
A Counter can complete Sales, Return requests and approvals, and Shift closing while offline.

**Consequences (testable):**
- All Counter functions in §4.2 and §4.3 work with the network disconnected after the Counter has synced at least once.
- The Counter shows whether it is online, offline or syncing.
- A Counter can work offline for up to 72 hours since its last successful Sync, which covers any realistic outage. Decided by the product owner on 2026-10-07.
- The Counter shows the time left before it must check in, and warns the Cashier and Manager when less than 24 hours remain. `[ASSUMPTION]` 24-hour warning.
- After 72 hours without a successful Sync, the Counter lets the Cashier finish and print a Sale already in progress, then accepts no new logins and no new Sales until it syncs. Unsynced data stays stored and is sent on the next Sync. The Counter never deletes it.
- The 72 hours are measured as elapsed time since the last successful Sync, so changing the Counter's clock does not extend them.

#### FR-16: Sync
A Counter sends its stored Sales, Returns, approvals and Shift data to the cloud, and receives updated Products, prices, staff, Roles and Registered Device status when the connection returns. A new Counter downloads the Mart's full Product catalog once, then receives only changes.

**Consequences (testable):**
- No Sale is lost or duplicated if the connection drops during Sync; retrying is safe.
- Two Counters selling the same Product while offline both sync with no conflict; stock reflects both.
- While online, a Counter sends each Sale to the cloud within seconds, and receives Product edits other than price within seconds. `[ASSUMPTION]` 5 seconds.
- When the connection drops, the Counter keeps selling and queues its data. When the connection returns, it resyncs by itself, with no action by the Cashier.
- A Counter applies a new price only at a Shift boundary (FR-9), after it has received it. A Sale keeps the price the Counter used when the Sale was made.
- The first catalog download for a Mart of 500,000 Products is split into parts, compressed and resumable: if it is interrupted, it continues where it stopped. The Counter can start selling only after the catalog is complete.
- After the first download, a Counter receives only Products and prices changed since its last Sync.
- Stock quantities are never sent to Counters. A Counter sells any scanned Product, at any stock level.
- After the server confirms a Sale, the Counter keeps its local copy for 48 hours, then clears it.
- A Sync failure is visible on the Counter and the Owner can see the last Sync time per Counter.
- If the server rejects a stored event as invalid, the Counter keeps it aside, shows it as a problem on the Counter and to the Owner, and keeps syncing later events. The event is never deleted.
- Parked events are shown for information only, in a list in the Exceptions Report. There is no accept or dismiss action. To put their effect into stock, a user enters the usual correcting records (Spot Count or Delivery correction). Decided by the product owner on 2026-10-12.
- Uploads from a revoked Registered Device or a deactivated Branch: Sales, Returns and approvals made before the revoke or deactivation time are accepted, because money already changed hands, and are flagged in the Exceptions Report. Those made after it are parked. The device stays revoked: it can upload, but cannot log anyone in or sell. Decided by the product owner on 2026-10-12.
- After the cloud database is restored from a backup, every Counter re-sends every event it still holds, including acknowledged ones in their 48-hour window. Repeats are ignored by their IDs, so the gap since the backup is filled with no duplicates.
- The Counter warns the Cashier and Manager when it holds unsynced Sales older than a set time (`[ASSUMPTION]` 1 hour), and the Owner sees the unsynced Sale count per Counter.

### 4.8 Shift Close

**Description:** At the end of a Shift the Cashier counts the cash in the drawer and enters it. The system compares it with expected cash. `[ASSUMPTION]` Per-Cashier, per-Counter.

**Functional Requirements:**

#### FR-17: Close a Shift
A Cashier can start a Shift by entering the opening cash float and close it by entering the counted cash.

**Consequences (testable):**
- A Counter has at most one open Shift at a time; the next Cashier opens theirs after the previous one is closed. Decided by the product owner on 2026-10-13.
- Expected cash is the opening float plus cash Sales minus accepted cash refunds for the Shift.
- A user with the close Shifts Permission can close a Shift that a Cashier left open, entering the counted cash, and the closing is attributed to that user. The difference is recorded.
- A non-zero difference appears in the Exceptions Report.
- Each Cashier's Sales total for the day is available to the Owner.

### 4.9 Owner Dashboard and Exceptions Report

**Description:** The Owner opens the app in a phone browser and sees read-only numbers across all Branches, or one Branch at a time. The same pages work on desktop. Layout adapts to screen width. What a user can do depends on Role and Registered Device, not on whether the screen is a phone. Realizes UJ-3.

**Functional Requirements:**

#### FR-18: Sales dashboard
A user with the view dashboard Permission can see sales for today and for a chosen date range, for the Branches their Role covers.

**Consequences (testable):**
- The Owner sees all Branches together and can filter to one.
- Shows total sales in the Mart's currency, Sales by Cashier, and Sales by payment type. Accepted Returns reduce the totals.
- Shows low stock (Units at or below the reorder level) and negative stock lists.
- Shows a searchable stock level in Units for every Product, not only low or negative ones.
- The low and negative stock lists and the stock search are also open to users with view Exceptions Report, so Managers can reorder without seeing sales figures. Decided by the product owner on 2026-10-13.
- Readable and usable on a phone-width screen with no editing controls.
- Sales from online Counters appear within seconds. `[ASSUMPTION]` 5 seconds.
- Data shows its last Sync time, so offline Counters are visible.

#### FR-19: Exceptions Report
A user with the view Exceptions Report Permission can see the Exceptions Report.

**Consequences (testable):**
- The report lists:
  - negative stock
  - Spot Count differences (counted Units differ from system Units)
  - damaged Returns
  - Returns per Cashier and per Approver (with accepted, rejected and still pending counts)
  - long-pending Returns (pending longer than 30 minutes by default, configurable per Mart; decided 2026-10-13)
  - typed-in Barcode entries per Cashier
  - Shift cash differences
  - parked events (FR-16) and Sales accepted from revoked devices or deactivated Branches
  - PIN lockouts at Counters (FR-3)
  - any Product whose stored stock differs from the total of its Stock Events (found by a scheduled check, never corrected silently)
- Each item links to the underlying records.

### 4.10 Audit Log

#### FR-20: Audit Log
The system records every stock, price, Product, user, Role, Return decision and Registered Device change.

**Consequences (testable):**
- Each entry has who, what changed (old and new values), when and from which device.
- Entries cannot be edited or deleted through the app.
- The Owner can view and search the Mart's Audit Log, and delegate that view through a Permission.

### 4.11 Super Admin and Mart Registration

**Description:** The platform operator manages which Marts exist. Super Admin accounts are created by seeding the database, not through the app. A Super Admin never sees a Mart's business data. Realizes UJ-5.

**Functional Requirements:**

#### FR-25: Register and manage Marts
A Super Admin can create a Mart with its Owner, send the Owner a one-time setup code, and suspend or reactivate a Mart.

**Consequences (testable):**
- A Mart's name, Owner name and Owner contact are required to create it.
- The Owner sets a password with the setup code, which works once and expires.
- Suspending a Mart (for example when its subscription ends) blocks all its logins on next contact with the server. Offline Counters keep selling until their next Sync, but never longer than the offline limit in FR-15. Then they lock.
- When an online Counter of a suspended Mart contacts the server, it first uploads its unsynced Sales, Returns and Shift data, and the server accepts them. Then the Counter locks. Decided by the product owner on 2026-10-13.
- A locked Counter of a suspended Mart keeps any data it could not upload stored on the Counter. Nothing is deleted.
- When the Mart is reactivated, each Counter syncs first, and the Cashier cannot sell until that Sync completes.
- A Super Admin sees a list of Marts with name, Mart code and status only. No Mart sales, stock, staff activity or Audit Log is visible to them.
- Super Admin actions are recorded in a platform audit log.

**Out of Scope:** billing, subscriptions and plan limits (the Super Admin switches a Mart on or off by hand in v1); creating Super Admin accounts through the app.

### 4.12 Branches

**Description:** An Owner can run several shop locations under one Mart. Each Branch holds its own stock, Counters, Registered Devices and Shifts; Products and suppliers are shared across the Mart.

**Functional Requirements:**

#### FR-26: Manage Branches
The Owner can create, edit and deactivate Branches and assign staff to them. Creating and deactivating Branches is Owner-only. A user with manage Branches and devices can edit the settings of Branches they are assigned to. Branch settings: name, time zone (NFR-11), cutover date (FR-14), and the local time of the nightly stock balance check (default 03:00). Decided by the product owner on 2026-10-13.

**Consequences (testable):**
- Every Stock Event, Sale, Return, Delivery, Shift and Registered Device belongs to exactly one Branch.
- A user sees and changes data only for the Branches they are assigned to; the Owner sees all.
- Stock is never shared between Branches, and there are no stock transfers in v1.
- A deactivated Branch cannot sell; its history stays visible to the Owner.
- Branch changes are written to the Audit Log.

## 5. Cross-Cutting Requirements

- **NFR-1 Availability at the Counter:** defined in FR-15.
- **NFR-2 Data durability:** the cloud database is backed up automatically at least every hour (point-in-time recovery), with restore tested before go-live. This addresses the single-hard-drive risk. Because Counters keep events for 48 hours after acknowledgement, they re-send what a restore lost (FR-16). Decided by the product owner on 2026-10-12.
- **NFR-3 Security:** passwords stored hashed; all traffic over HTTPS; the server enforces Permissions, Branch assignment and Registered Devices on every request. Data stored locally on a Counter is limited to what offline selling needs; what is encrypted at rest is set in FR-3.
- **NFR-4 Device targets:** the Counter and Branch server-room PC use a desktop browser, with the Counter installed as a web app, and a USB keyboard-style scanner and an ESC/POS thermal printer. The Counter may later be packaged as a desktop program with no change to what it does; this is an architecture decision, not a v1 requirement. The phone dashboard works in a current mobile browser. `[ASSUMPTION]` hardware models unconfirmed.
- **NFR-5 Language, currency and tax:** English UI only; Urdu is not required. Product names may still be typed in Urdu text. Currency is a per-Mart setting, PKR in whole rupees for the pilot. No tax handling: prices are final and the Sales Receipt shows one total with no tax line (confirmed for the pilot Mart; other Marts' tax needs are not covered in v1).
- **NFR-6 Tenant isolation:** one deployment serves many Marts. Every record belongs to one Mart and, where relevant, one Branch. A user can never read or write another Mart's data, and the Super Admin can never read a Mart's business data. Every account belongs to exactly one Mart. The server enforces this on every request; tests cover cross-Mart access attempts.
- **NFR-7 Cost:** a small monthly hosting cost is acceptable. `[ASSUMPTION]`
- **NFR-8 Scale:** sized for tens of Marts in the first year, each with a few Branches, 2 to 4 Counters per Branch, fewer than 15 Cashiers per Branch and at least 500,000 Products per Mart. `[ASSUMPTION]` Scanning a Barcode and searching by name stay within the targets in NFR-10 at that size.
- **NFR-9 Onboarding without code changes:** adding a Mart or a Branch is done in the app and needs no deployment or code change.
- **NFR-10 Performance targets** (pass or fail for the Counter spike and later tests, with 500,000 Products; decided by the product owner on 2026-10-12):
  - scan to line in the cart: under 200 ms, online or offline
  - search by name: first results under 500 ms
  - complete a Sale to receipt printing: under 2 s
  - Manager and Owner screens and reports for one day's data: under 3 s
  - 500,000-row Product import: done within 30 minutes, with the screen usable meanwhile
- **NFR-11 Time zone:** all times are stored in UTC. Each Branch has a time zone setting (default Asia/Karachi). "Today", Shifts and daily figures for a Branch use its time zone; Mart-wide reports use the Mart's default time zone. Decided by the product owner on 2026-10-12.

## 6. Non-Goals (Explicit)

Things this product will not become.

- Not a card payment processor; cards are recorded only.
- Not a purchasing, supplier-payment or accounting system.
- Not a customer loyalty, e-commerce or delivery product.
- No tax calculation or tax reporting, and no Urdu or other language UI (NFR-5).

## 7. MVP Scope

### 7.1 In Scope
Super Admin and Mart registration; Branches; Owner-defined Roles and Permissions; offline-capable Counters; scanning, typed-in Barcodes, cash and card recorded; Sales Receipts on a thermal printer; Returns with Approver acceptance and restock or damaged marking; individual logins limited to Registered Devices; Product and price management (Mart-wide with Branch price override); Deliveries with purchase prices and Conversion; Spot Counts and opening count; Shift close with cash count; read-only phone dashboard and Exceptions Report across Branches; Audit Log; automatic backups.

### 7.2 Out of Scope for MVP
Things deferred, not rejected, unless stated.
- Billing, subscriptions and plan limits (not a billing system in v1).
- Stock transfers between Branches.
- Remote stock entry and phone-camera scanning, because a stolen phone or password could alter inventory and receiving is physical anyway (v2 candidate: phone receiving with Owner approval).
- Weighed or loose items.
- Import of an old system's history.
- Discounts, held carts, manual price override.
- Profit and margin reports (purchase prices are stored for later).
- Expiry date tracking. `[ASSUMPTION]`
- Several Owners per Mart. A partner gets a custom Role with near-Owner Permissions. Decided by the product owner on 2026-10-12.
- One login across several Marts; a human in two Marts has two accounts.
- Voiding a completed Sale (use a Return).

### 7.3 Build Order
Platform basics (Mart, Branch, login, Registered Devices), then offline Counters, then Receiving, then Returns approval, then stock accuracy and Spot Counts, then the phone dashboard. `[ASSUMPTION]` Platform basics come first because every other record belongs to a Mart and Branch.

## 8. Success Metrics

All four primary metrics have equal priority for v1; none is traded for another.

**Primary**
- **SM-1**: No blocked Sales during outages. Every outage is followed by a clean Sync with zero lost Sales. Target: zero blocked Sales and zero lost Sales. Validates FR-3, FR-15, FR-16.
- **SM-2**: Delivery entry time. Time to enter a typical Delivery versus the Manager's current method. Target: set after measuring the old process. Validates FR-11.
- **SM-3**: Stock matches the shelf. Spot Count differences as a share of Units counted. Target: set from the first full count, not guessed now. Validates FR-13, FR-14.
- **SM-4**: The Owner checks daily sales from a phone without calling the Manager. Target: Owner opens the dashboard on at least 5 days a week. `[ASSUMPTION]` Validates FR-18.

**Counter-metrics (do not optimize)**
- **SM-C1**: Number of Returns. Do not drive it down; that would pressure Cashiers and Approvers to refuse legitimate Returns. Counterbalances FR-19 reporting.
- **SM-C2**: Sales per minute per Cashier. Do not use it to rank Cashiers; it would reward skipping scans or typed-in codes. Counterbalances SM-1.
- **SM-C3**: Sync speed. Do not trade correctness for speed. A fast Sync that duplicates or drops Sales is a failure. Counterbalances SM-1.
- **SM-C4**: Return approval speed. Do not push Approvers to accept quickly; a rubber-stamped Return defeats the approval. Counterbalances FR-24.

## 9. Open Questions

1. What are the exact scanner, printer and PC models?
2. What format is the pilot Mart's old app data in? Action: copy its data folder and identify the app.
3. Are expiry dates needed for dated goods such as milk?
4. What is the first-count stock-accuracy target (SM-3), and what is today's Delivery-entry time (SM-2)?
5. Is internet at the pilot Mart reliable enough that outages are rare? Not yet confirmed; offline selling is built either way.
6. Is hard-drive corruption really the main pain, and are loose or weighed items truly never sold? Both are unconfirmed.
7. Will later Marts need their own tax, currency or language? Out of v1, but it affects how settings are modeled.
8. When does billing enter scope, and does it need plan limits (Branches, Counters, users)?

Questions 1 to 6 need facts from the pilot Mart. Former questions on Owner recovery, number of Owners, code formats and uploads from revoked devices were decided on 2026-10-12 (FR-22, §7.2, FR-27, FR-16).

## 10. Assumptions Index

Every inline `[ASSUMPTION]` tag, by location.

- §4.1 FR-1: the Permission list is a first cut.
- §4.1 FR-22: device codes last 10 minutes.
- §4.2 FR-4: no discounts, held carts or price override in v1.
- §4.4 FR-9: reorder level default none; new prices apply at the next Shift boundary.
- §4.4 FR-10: bulk import is CSV.
- §4.6 FR-14: one full physical count per Branch before go-live.
- §4.7 FR-15: the check-in warning appears when less than 24 hours remain.
- §4.7 FR-16: online Counters send Sales and receive non-price Product edits within 5 seconds; unsynced-Sales warning threshold of 1 hour.
- §4.9 FR-18: online Sales appear on the dashboard within 5 seconds.
- §4.8: Shift close is per Cashier, per Counter.
- §5 NFR-4, NFR-7, NFR-8: generic hardware; small hosting cost; sizing numbers (at least 500,000 Products per Mart).
- §7.2: expiry dates not tracked.
- §7.3: platform basics first in build order.
- §8 SM-4: Owner opens the dashboard on at least 5 days a week.

## 11. Risks and Unconfirmed Assumptions

- **Offline sync is the largest build risk.** It shapes the data model from day one: additive Stock Events, per-Counter receipt numbers, and Counter data encrypted at rest. Unsynced Sales live only on one Counter until Sync.
- **Tenant isolation.** One bug that lets a query cross Mart or Branch boundaries exposes one customer's data to another. Isolation must be enforced centrally on the server, not left to each feature, and tested.
- **Return approval friction and collusion.** Approval slows the counter when no Approver is near, and a Cashier and an Approver could collude. The controls are the Counter login path, Approver counts in the Exceptions Report, and long-pending alerts. A rubber-stamping Approver is a human risk the system can only make visible.
- **Old app data is unverified** for the pilot Mart. Format unknown; import of history is not in v1. Cutover needs one full physical stock count per Branch.
- **Browser storage can lose unsynced Sales.** The Counter runs as a web app first, and a browser can clear or evict its stored data. Until a desktop version exists, the unsynced-Sales warning (FR-16), frequent Sync and a persistent-storage request are the safeguards. A test with a 500,000-Product catalog and the real thermal printer must pass before the web Counter is accepted.
- **Catalog size.** At 500,000 Products the first download, local search and import are real build risks, not edge cases.
- **Unconfirmed items** (§9, questions 5 and 6): internet reliability, hard-drive pain, no weighed items.
- **Not done:** a comparison with existing cloud POS products. For a SaaS offering this matters more than for an internal tool, and should be done before the first sale to a second Mart.

## 12. Changelog

**Revision note (2026-10-06):** scope changed from a single-Mart internal tool to a multi-tenant SaaS (Super Admin, Marts, Branches, custom Roles), and Returns now need Approver acceptance. This revision has not yet been through a second reviewer pass.

**Revision note (2026-10-07):** a Mart now holds at least 500,000 Products (was 2,000 to 5,000), so Counters hold a full local catalog and Sync must handle it (FR-3, FR-10, FR-16, NFR-3, NFR-8). The Counter ships first as an installable web app; a desktop wrapper may follow later (NFR-4). Architecture decisions are in `planning-artifacts/architecture/architecture-POS-System-2026-10-06/ARCHITECTURE-SPINE.md`.

**2026-10-13 (readiness review):** Permission scope for Mart-wide data and staff disabling by non-Owners (FR-1); Branch create/deactivate Owner-only, Branch settings include cutover date and stock check time (FR-26); refund amount is the Counter's current selling price (FR-8); one open Shift per Counter (FR-17); stock lists open to view Exceptions Report (FR-18); Counter decision wins when a Return is decided twice, and non-selling Approver sessions at the Counter (FR-24); Super Admin list shows Mart code (FR-25).

**2026-10-13:** starter Roles set (Cashier: sell and request Return; Manager: every Permission except view dashboard); view dashboard split from a new view Exceptions Report Permission; Roles can only be granted by someone who holds their Permissions, and nobody edits their own Role (FR-1); strict-subset rule for PIN resets written out (FR-27). A suspended Mart's online Counter uploads its unsynced data before locking (FR-25). Replacement Counter safe gap set to 10,000 (FR-23). Long-pending Return threshold 30 minutes, configurable per Mart (FR-19).

**2026-10-12:** open design gaps decided. New FR-28 Barcode model: many Barcodes per Product, each Barcode in exactly one Product, optional generic Products grouping several brands at one price, pack Barcodes, in-store codes; glossary updated (Packs can now scan). Uploads from revoked devices or deactivated Branches accepted and flagged if made before the revoke, otherwise parked; parked events are view-only (FR-16). Hourly backups and Counter re-upload after a restore (NFR-2, FR-16). PIN lockout (FR-3). Owner recovery via Super Admin (FR-22); one Owner per Mart (§7.2); code formats (FR-27). Replacement Counter downloads from the cloud only (FR-22). Opening stock CSV import (FR-14). Performance targets NFR-10 (replaces the 300 ms scan target) and per-Branch time zone NFR-11. Open questions reduced to 8.

**2026-10-08:** real-time sync while online, with queueing and automatic resync when offline (FR-16, FR-18); new prices saved at once but applied at Counters only at a Shift boundary (FR-9); all other Product edits reach online Counters within seconds.

**2026-10-07 (later):** offline limit set to 72 hours since the last Sync (FR-15); local Product catalog not encrypted at rest (FR-3); sync rules for parked events and retention (FR-16); stock balance mismatches added to the Exceptions Report (FR-19); reviewer pass applied, with decisions on the 72-hour lock (finish the current Sale, then lock; elapsed-time timer), late offline approvals (accept and flag), refund amount (current Branch price) and suspended Marts (data stays on the Counter until reactivation and Sync): Permission names unified, FR-27 split out of FR-1, wording and structure fixes.
