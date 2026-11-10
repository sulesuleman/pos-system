# Reconciliation: brief.md + addendum.md vs PRD

Intentional changes excluded (single-tenant clones, English/PKR/no tax, purchase price on Delivery, "Delivery" term, device registration and receipt numbering resolved).

## Real gaps

1. **Pack sizes vary by supplier (weakened).** Addendum: "Pack sizes vary by product and supplier." PRD Glossary/FR-9 defines Conversion per Product only. A Product bought from two suppliers with different pack sizes has no way to express it, and FR-11 blocks or mis-converts. Decide: per-Product Conversion with line-level override on a Delivery, or per-supplier Conversion.

2. **Receiving-time verification dropped.** Brief problem: stock is verified only for opened cartons, sealed cartons are trusted on the supplier label. PRD FR-11 has no receipt check (for example a short or damaged carton note, or an optional count of a sample). Spot Counts are the only control. Record this as a deliberate non-goal or add a lightweight discrepancy note on the Delivery.

3. **Owner stock view weakened.** Brief and addendum give the Owner "stock levels" and "stats, stock" on the phone. FR-18 shows only low-stock and negative-stock lists, and no per-Product stock lookup. Consider a read-only stock lookup, or confirm that this is intended.

4. **Risks and unconfirmed items not carried.** (a) The brief's returns-abuse risk says the exceptions report is the only control and works only if the Owner reads it. The PRD has SM-C1 and FR-19 but no risk entry, and nothing to prompt the Owner (for example a daily exceptions count on the dashboard home). (b) "Hard-drive failure is the main pain" and "no loose items sold by weight" were listed as unconfirmed. The PRD Open Questions keep only internet reliability; the other two are now stated as fact. (c) The brief says offline sync "shapes the data model from day one". The PRD has no explicit constraint tying the data model or architecture to this.

5. **Vision / extensibility dropped.** The brief vision says the foundation (suppliers, purchase orders, multiple counters or stores) should grow without a rewrite. The PRD Non-Goals exclude purchasing and the PRD has no extensibility NFR. Suppliers are only a field on a Delivery. Mention at least that supplier should be a first-class entity for later growth. Also not carried: the brief note that no comparison with existing cloud POS products was done (competitive landscape not discussed).
