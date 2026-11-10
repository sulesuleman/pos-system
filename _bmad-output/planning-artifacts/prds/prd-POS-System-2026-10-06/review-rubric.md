# PRD Quality Review — Cloud POS and Inventory for a Mart

## Overall verdict
This is a strong PRD for an internal single-Mart tool. It has a real thesis ("a Counter never stops selling", with stock derived from additive events so Counters never conflict). Its FRs carry testable Consequences, its Non-Goals and MVP cuts are explicit, and the Glossary is disciplined. The risk is concentrated in the offline half of the design. The durability and security of data held on a Counter are parked in Open Question 5 even though FR-2, FR-3 and FR-16 depend on them. A few operational definitions (low stock, expected cash, the full list of Stock Event types, suppliers) are missing, so downstream stories will have to invent them.

## Decision-readiness — adequate
Decisions are stated as decisions, and the PRD names what it gave up. Examples are "A Return needs no manager approval or PIN" (FR-8), "Selling is never blocked by stock level" (§4.2), "The cloud copy always wins for Products and prices" (§4.4), and the Registered Device rule that makes the Owner read-only on a phone (§4.1, FR-2). The counter-metrics in §8 are unusually honest about perverse incentives. The device-registration flow (FR-2: one-time codes, recovery code, replacement of a dead server-room PC) is worked through concretely rather than waved at.

What weakens it is that the hardest tension is left open. The offline Counter holds hashed credentials (FR-3), a device secret token (FR-2) and unsynced Sales. Open Question 5 ("how is it protected on the machine?") defers the threat model, yet NFR-3 only says local data is "limited to what offline selling needs". The PRD also contains no `[NOTE FOR PM]` callouts. The no-approval Return policy is a real tension: it relies entirely on after-the-fact Exceptions Report review (UJ-3), and a callout was warranted there. Open Question 6 ("Is internet … reliable enough that outages are rare?") is rhetorical, because the Vision already makes offline a hard requirement "either way".

### Findings
- **[high]** Offline data durability and protection deferred to an open question (§9 Q5, FR-2, FR-3, NFR-2, NFR-3) — NFR-2 backs up the cloud database only. Sales made offline exist solely on one Counter's local storage until Sync, which recreates the "single hard drive" risk the Vision (§1) and JTBD ("stop depending on one hard drive") set out to remove. A stolen or failed Counter would also carry its device token and cached credential hashes, and revocation only takes effect "on its next contact with the server" (FR-2). *Fix:* state the accepted exposure (for example, maximum unsynced window, what happens on a Counter disk failure, whether local data is encrypted). Promote Q5 to a decision or a `[NOTE FOR PM]`, and add a bound on how long a Counter may go unsynced.
- **[low]** Open Question 6 is not open (§9) — "offline selling is built either way". *Fix:* move it to an assumption about outage frequency, or drop it.
- **[low]** No `[NOTE FOR PM]` at the Return-without-approval tension (FR-8, §4.3) — the control is purely detective. *Fix:* add a callout that acknowledges the fraud exposure and names the Exceptions Report as the sole control.

## Substance over theater — strong
There is no persona theater. There are three roles (Cashier, Manager, Owner), and each drives requirements (individual logins, per-Cashier exception counts, read-only Owner on a phone). There is no innovation theater. The Vision names the Mart's actual pain ("single hard drive … nobody outside the room can see the numbers") and could not be swapped into another PRD. Most NFRs carry product-specific numbers or rules (NFR-8 scale, the 300 ms scan target, NFR-5 whole-rupee PKR, no tax line). The weaker ones are decorative.

### Findings
- **[low]** NFR-7 and NFR-4 are adjectives (§5) — "a small monthly hosting cost is acceptable", "a current mobile browser". *Fix:* give a monthly ceiling, or delete NFR-7. Name minimum browser versions, or defer to architecture explicitly.

## Strategic coherence — strong
The thesis is clear and the features follow it. Event-sourced stock makes offline selling conflict-free (§1, §4.7). Returns, Spot Counts and the Exceptions Report all feed the Owner's trust job. SM-1 directly tests the thesis (zero blocked or lost Sales across outages). SM-C2 and SM-C3 counterbalance it well. MVP scope is problem-solving and fits an internal tool. SM-2 and SM-3 deliberately leave targets unset ("set after measuring the old process"), which is honest and recorded in §9 Q4.

### Findings
- **[low]** SM-4 has no real threshold (§8) — "Owner opens the dashboard on most days" is an activity metric that doesn't test whether the Owner stopped calling the Manager. *Fix:* define "most days" (for example, 5 of 7) and add an observable proxy for the real outcome.
- **[low]** Build Order omits prerequisites (§7.3) — "Offline Counters, then Receiving, then stock accuracy … then the phone dashboard" skips Auth/Devices, Products and import, Returns, and Shift close, all of which Counters need before go-live. *Fix:* list them or mark the order as partial.

## Done-ness clarity — adequate
This is the best-executed part of the PRD. Nearly every FR has a "Consequences (testable)" block with verifiable conditions (FR-2, FR-7, FR-16, FR-20 are good examples). Gaps are about missing definitions rather than vague adjectives. An engineer would not know what counts as "low stock" or "mismatched stock", whether suppliers are managed anywhere, or how expected cash is formed.

### Findings
- **[medium]** "Low stock" and "mismatched stock" are undefined (FR-18, FR-19, UJ-3, Glossary "Exceptions Report") — there is no threshold, per-Product reorder level, or definition of "mismatched". *Fix:* define low stock (a global or per-Product threshold, or explicitly "out of scope; negative stock only") and define "mismatched" (for example, a Spot Count difference ≠ 0).
- **[medium]** Supplier has no FR (FR-11 "choose a supplier") — nothing creates, edits or lists suppliers, and the term is not in the Glossary. *Fix:* add a minimal supplier FR (name only) or state that suppliers are a free-text field on the Delivery.
- **[medium]** Shift and cash definition is thin (FR-17, Glossary "Shift", §4.8) — expected cash is "cash Sales minus cash refunds" with no opening float. Nothing says how a Shift starts, what happens when a Cashier never closes one (for example, a power loss at an offline Counter), or whether Shift close is blocked by unsynced state. *Fix:* add Shift open (with optional float), define handling of an abandoned Shift, and add Consequences.
- **[medium]** FR-1's disabled-account consequence is not testable as written (FR-1) — "cannot log in on any device, including a Counter that is offline with cached credentials once that Counter next syncs" is self-contradictory, because it admits the account can log in offline until Sync. *Fix:* state the actual rule (a disabled user can still log in offline until the next Sync; after Sync they cannot), and accept or bound that window.
- **[medium]** Edge cases around Returns and unknown Barcodes (FR-8, FR-9) — FR-8 does not say what a Return of an unknown or deactivated-Product Barcode does. FR-5 defines "not found" for the sale path only. Returns are also not tied to the original Sale (declared out of scope), so a Return can exceed what was sold. The latter is acceptable but should be stated alongside the Exceptions Report as the only control. *Fix:* add one Consequence for unknown or inactive Barcodes on Return.
- **[low]** Vague or misplaced Consequences — FR-18 "Readable and usable on a phone-width screen" has no bounds (name a width, for example 360 px). FR-7's 300 ms target is about scanning, not receipts, so it sits under the wrong FR (move it to FR-4 or §5). FR-4 embeds an `[ASSUMPTION]` inside a testable Consequence, which muddles what a test must assert. The receipt-number "safe gap" (FR-7) has no value.

## Scope honesty — strong
§6 Non-Goals and §7.2 are specific and do real work (no tax, no Urdu UI, no void, no discounts, no history import). Per-FR "Out of Scope" lines (FR-2, FR-5, FR-8) pre-empt silent assumptions. Assumptions are tagged inline and indexed. The open-items count (6 questions, about 13 assumptions) is proportionate for a draft internal tool. The one under-examined omission is a compliance one.

### Findings
- **[medium]** "No tax handling" is asserted without a compliance check (NFR-5, §6) — retail POS in Pakistan can carry regulatory expectations (for example, tax-authority POS integration for certain retailers; verify applicability to this Mart). The PRD records it as settled, not as an assumption. *Fix:* tag it `[ASSUMPTION]` or add an Open Question: "Is this Mart legally required to issue tax-compliant receipts or integrate with the tax authority's POS system?"

## Downstream usability — adequate
IDs are contiguous and unique (FR-1 to FR-20, UJ-1 to UJ-4, SM-1 to SM-4, SM-C1 to SM-C3, NFR-1 to NFR-8). Every UJ has a named protagonist with context. The Glossary is thorough and mostly followed. Each feature block "Realizes UJ-n", and each SM names the FRs it validates. The main weakness is that the Glossary's Stock Event model is incomplete.

### Findings
- **[medium]** Stock Event definition and the stock formula omit event types the FRs create (Glossary "Stock Event", §4.6 Description, FR-12, FR-14) — the Glossary lists "Delivery, Sale, restocked Return, or Spot Count correction". The §4.6 formula likewise omits opening stock count (FR-14, "recorded as Stock Events") and Delivery corrections (FR-12, "a new Stock Event that references the original"). The stock model is the architectural core, so architects will source-extract from these definitions. *Fix:* enumerate all Stock Event types in the Glossary and the §4.6 formula, and state that damaged Returns create no Stock Event, or create a non-sellable one.
- **[low]** Undefined terms used in FRs (Glossary) — "dashboard", "setup code", "recovery code", "server-room PC", "typed-in Barcode" and "Manual Barcode entry" (FR-5 title) are used interchangeably or are absent from the Glossary. The Manager glossary line says "on Registered Devices only", while FR-2 lets Managers use read-only screens on unregistered devices. *Fix:* add the terms and align the Manager definition with FR-2.

## Shape fit — strong
The shape matches the product. It is a capability-spec PRD for an internal tool with four role-driven UJs and operational success metrics. Four UJs is at the top of what a single-operator tool needs, but each one exercises distinct FRs (offline, receiving, remote read-only, returns), so they are not overhead. §0 correctly positions the PRD as feeding UX, architecture and epics, and the Glossary and Consequences support that role.

## Mechanical notes
- **Glossary drift:** "typed-in Barcode" (UJ-3, FR-5 Consequences, FR-19) versus "Manual Barcode entry" (FR-5 title). "Shift closing" (FR-15) versus "Close a Shift" (FR-17). "Counter machine" (FR-7) versus Counter as a station (UJ-1 "Counter 2"). Minor.
- **ID continuity:** no gaps or duplicates. §0 contains the template leftover "FR-1 to FR-N" (should be FR-20).
- **Assumptions Index roundtrip:** every inline `[ASSUMPTION]` appears in §10 (FR-4, FR-7 300 ms, FR-10 CSV, FR-14, FR-15, §4.8, NFR-2/4/7/8, §7.2 expiry). The index entry lists NFR-5 but NFR-5 carries no inline `[ASSUMPTION]`. Either tag the tax/language decision (see the Scope honesty finding) or remove it from the index. §7.2 expiry duplicates Open Question 3, which is harmless.
- **Redundancy:** NFR-1 restates FR-15 and could be removed or cross-referenced.
- **UJ protagonists:** all four named (Nadia, Imran, Hamza, Nadia). UJ-3 and UJ-4 omit explicit Entry state or Edge case fields, which is acceptable.
- **Required sections:** all present for the stakes and product type. There is no Addendum, and none is needed.
