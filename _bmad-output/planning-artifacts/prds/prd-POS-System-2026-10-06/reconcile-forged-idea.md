# Reconciliation: forged-idea.md vs PRD

Input: `_bmad-output/forge/cloud-mobile-first-pos/forged-idea.md`
Intentional post-input decisions (individual logins on registered devices, Mart-machines-only editing, restock/damaged returns, English-only/no tax, purchase price on Deliveries, no multi-tenancy) are excluded.

## Real gaps

1. **No risks section; "Open risks" dropped.** The input names offline sync as the largest build risk. The PRD has no risk register, so downstream architecture and epics get no signal to front-load or spike sync. Offline Counters first in build order (§7.3) is the only trace.
2. **Return-abuse risk weakened.** The input flags that unapproved returns allow refund abuse and restocking damaged goods. The PRD only reports Returns per Cashier. Nothing addresses a Cashier mislabeling a damaged item as restock, and nothing says damaged returns need a physical check or reconciliation (Spot Count is the only indirect catch). SM-C1 also discourages reducing returns, but no mitigation is stated.
3. **Unconfirmed assumptions dropped.** The input lists as assumed, not confirmed: hard-drive corruption is the main pain, and no weighed items. The PRD keeps only internet reliability (§9 Q6). The "main pain = drive corruption" premise is stated as fact in the Vision and §2.1. "No weighed items" is listed as out of scope but not as an assumption to confirm. Neither is in the §10 index.
4. **"All v1 success criteria equal" lost.** The input says the four success goals carry equal weight (never stops selling, faster receipt entry, stock matches shelf, owner checks on phone). The PRD has SM-1 to SM-4 but marks no priority or equality. SM-1 is framed as a hard requirement and the others as targets to set later, which could skew trade-offs.
5. **Rationale for rejecting remote entry dropped.** The input explains the rejection: a stolen phone or password could alter inventory, and receiving is physical anyway. The PRD lists the exclusion and the v2 candidate (§7.2) without the reason, so a later reader may reopen it. Minor.

## Covered (no gap)
Additive stock events, exceptions not conflicts, cloud wins on prices, carton/pack/unit conversion, unit-only barcodes, cash/card recorded only, thermal printer, audit log, old-data format unknown plus bulk import support plus full cutover count, build order, rejected-for-v1 list.
