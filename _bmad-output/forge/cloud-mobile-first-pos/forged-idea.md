# Forged Idea: Cloud POS + Inventory for a Mart

Replace the Mart's single server-room desktop retail app with a cloud, responsive web POS and inventory system. Existing flow: manager keys supplier receipts into the desktop; counters scan with USB scanners; stock deducts on payment.

## Locked
- **Counter never stops selling** (hard requirement). Counters work offline and sync later.
- **Sales are additive events**; stock = received − sold, so sales never conflict. Negative or mismatched stock goes to an exceptions report, not a conflict screen. Prices and product edits: cloud copy wins on sync.
- **Roles:** cashier sells only, with an individual login usable only on registered counters. Manager/owner edits stock, products and prices only from the Mart's own registered machines (server-room PC; no home PCs or phones). Admin/owner views stats read-only on a phone from anywhere. All stock, price and user changes are audit-logged.
- **Devices:** counter and server-room desktop use USB scanners. Phone is a read-only dashboard. "Mobile-first" means responsive web.
- **Products:** per-product carton → pack → unit conversion. Only single units have barcodes; cashiers scan units, receiving is by carton/pack count. All items prepackaged.
- **Payments:** cash and card, recorded only (separate card terminal). Thermal receipt printer.
- **Returns:** cashier handles at counter, no approval; policy taught in person or on paper. Cashier marks each return restock or damaged (damaged is not restocked). Returns per cashier shown in admin exceptions report.
- **v1 success (all equal):** never stops selling; faster receipt entry; stock matches shelf; owner checks sales on phone.
- **Build order:** offline counters → receiving → stock accuracy and counts → phone dashboard.

## Rejected for v1
- Remote stock entry and phone-camera scanning (a stolen phone or password could alter inventory; receiving is physical anyway). Phone receiving with owner approval is a v2 candidate.
- Weighed or loose items, card payment processing, existing-data import.

## Open risks
- Offline sync is the largest build risk.
- Old app data is unverified: format unknown, import deferred. Data model must support bulk import. Cutover needs one full physical stock count.
- Unapproved returns allow refund abuse and restocking damaged goods.
- Assumed, not confirmed: hard-drive corruption is the main pain; no weighed items; internet is reliable.
