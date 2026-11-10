# Addendum: detail for downstream documents

Source: `_bmad-output/forge/cloud-mobile-first-pos/` (forged-idea.md and .memlog.md).

## Design decisions for the PRD and architecture
- **Sales are additive events.** Stock = received − sold. Two offline counters selling the same item never conflict; both items physically left the shop.
- **Negative or mismatched stock** is a data-quality signal (missed receipt, miscount, theft), shown in an exceptions report, never as a conflict screen.
- **Non-additive data** (prices, product edits): cloud copy is authoritative; counters pick up changes on sync.
- **Registered devices:** stock, product and price editing, and all cashier logins, work only on the Mart's own registered machines (server-room PC, counters). The owner's home PC and phone are read-only dashboards and cannot be registered as editing devices in v1. A password alone is not enough. The check runs on the server. The owner must be able to register a replacement and revoke a lost or stolen device.
- **Cashier logins:** each cashier has an individual login, usable only on registered devices, with offline login via securely cached credentials. Every sale and return is stamped with cashier and counter, giving per-cashier daily sales and returns.
- **Unit hierarchy:** carton → pack → unit, conversion set per product. Only single units have barcodes. Example: 5 cartons of milk × packs per carton × bottles per pack = units added. Pack sizes vary by product and supplier.
- **Returns:** cashier handles at counter, no approval or PIN in the system. The return policy is taught in person or on paper. The cashier marks each return as restock or damaged (do not restock); damaged returns do not add to sellable stock. Returns per cashier appear in the exceptions report.
- **Audit log:** who changed which stock, price or user, and when.

## Rejected alternatives and why
- **Remote stock entry from outside the server room** and **phone-camera scanning:** a stolen phone or password could alter inventory, and receiving is physical anyway. v2 candidate: phone receiving with owner approval.
- **Manager approval or PIN limits for returns:** owner chose speed at the counter; policy is enforced by people, not the system.
- **Registering home PCs or phones as editing devices:** owner chose Mart machines only.
- **Online-only counters with failover (second ISP or 4G):** rejected in favor of offline-capable counters, because "never stop selling" is a hard requirement.

## Roles
| Role | Can | Cannot |
|---|---|---|
| Cashier | Scan, sell, take returns (restock or mark damaged), print receipts; log in only on registered counters | Change stock or prices |
| Manager/owner | Receive stock, edit products and prices, run counts (Mart's registered machines only) | Edit from home PC or phone |
| Admin/owner (phone) | View sales, stats, stock, exceptions | Change anything |

## Current setup (for context)
Server-room desktop runs a retail desktop app. A manager keys supplier receipts (name, barcode, quantity). Counter POS machines have barcode scanners; the cart is held locally and stock is deducted on payment. Sealed cartons are trusted by label quantity; opened cartons are counted. No routine shelf counts. Items include prepackaged goods (1kg oil, surf) and milk in packs.

## Deferred and unknown
- Existing-data migration: format unverified (guessed CSV or files). Action: copy the old app's data folder and identify the app.
- Weighed items, card processing, multi-store: out of v1.
- Stakes, customer model and competitive landscape were not discussed.
