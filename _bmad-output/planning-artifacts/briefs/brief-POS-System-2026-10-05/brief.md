---
title: "Product Brief: Cloud POS and Inventory for a Mart"
status: draft
created: 2026-10-05
updated: 2026-10-06
---

# Product Brief: Cloud POS and Inventory for a Mart

## Executive Summary

A Mart runs its whole operation from one desktop computer in a server room. A manager types every supplier receipt into an old retail desktop app, and the counters read from it. All inventory and sales history live on that machine's hard drive, so one disk failure, theft or power event can wipe out the records the business depends on. Stock accuracy depends on one person's typing and on trusting the label on each carton.

This product replaces that setup with a cloud-hosted, responsive web app covering point of sale and inventory. Data lives in the cloud. Counters keep selling when the internet drops and sync afterwards. The owner can check sales and stock from a phone, anywhere.

[ASSUMPTION] This is built first for a single Mart, with the owner as the customer. Selling to other marts is not in scope for the first version.

## The Problem

- **Fragile storage.** Inventory and history sit on one local hard drive that can corrupt or be lost.
- **No remote visibility.** The owner and manager must be in the server room to see stock or sales.
- **Unreliable stock numbers.** Stock is only verified at receiving, and only for opened cartons. Sealed cartons are accepted on the supplier's label. There are no routine shelf counts, so shrinkage (theft, damage, expiry) is invisible and errors are found by accident.
- **Manual unit math.** Supplier receipts arrive in cartons and sell as single units, so the manager converts by hand.

## The Solution

A responsive web app with three working surfaces:

- **Counter POS.** Cashiers scan single units with a USB scanner, take cash or card (recorded only), and print a thermal receipt. The counter works offline and syncs when the connection returns, so selling never stops. Returns are handled at the counter; the cashier marks each as restock or damaged.
- **Stock management on a registered device.** The manager receives supplier stock by carton or pack count; the system converts to units using a per-product conversion. Spot counts compare the system with the shelf.
- **Owner's phone dashboard.** Read-only sales, stats, stock levels and an exceptions report (stock mismatches, returns per cashier).

Stock is calculated from events (received minus sold), so concurrent sales at different counters never conflict. Mismatches surface as exceptions to review, not as conflicts to resolve. Prices and product edits are controlled from the cloud.

## What Makes This Different

Honestly, the advantage is fit, not technology. It replaces a fragile desktop app with a cloud system built around this Mart's actual workflow: carton-to-unit receiving, a hard never-stop-selling requirement, and a strict "only registered devices change stock" rule. The exceptions report turns invisible stock errors into a short review list. [ASSUMPTION] No claim is made yet about advantages over existing cloud POS products. That comparison has not been done.

## Who This Serves

- **Cashier:** scans and sells fast. Cannot change stock or prices.
- **Manager:** receives stock, edits products and prices, runs spot counts, from a registered device in the server room.
- **Owner/admin:** views sales, stats and exceptions on a phone, read-only, from anywhere. [ASSUMPTION] Owner and admin are the same person.

## Success Criteria

All four are equal priorities for the first version:

1. The counter never stops selling, including during an internet outage.
2. Supplier receipt entry is faster than it is today.
3. Stock matches the shelf: spot counts differ by only a small margin. [ASSUMPTION] target to be set from the first count, not guessed now.
4. The owner checks daily sales from a phone without calling the manager.

## Scope

**In version 1:** offline-capable counters; sales with cash/card recorded; thermal receipts; returns with restock or damaged marking; individual cashier logins limited to registered devices; carton → pack → unit conversion (only single units carry barcodes); manager stock receiving and spot counts; roles and registered-device rule; audit log of stock, price and user changes; read-only phone dashboard with exceptions report.

**Out of version 1:** remote stock entry and phone-camera scanning (later, possibly with owner approval); items sold by weight; card payment processing; import of existing data from the old app; multiple stores.

**Suggested build order:** offline counters → receiving → stock accuracy and counts → phone dashboard.

## Key Risks and Unknowns

- **Offline sync** is the largest technical risk and shapes the data model from day one.
- **Old app data** has an unknown format and is unverified. Migration is deferred; the data model must support bulk import, and cutover needs one full physical stock count.
- **Returns without approval** allow refund abuse. Damaged items are kept out of stock by the cashier's restock/damaged choice. The exceptions report (returns per cashier) is the only system control, and only works if the owner reads it.
- **Unconfirmed:** hard-drive failure is the main pain; internet at the Mart is reliable; no loose items are sold by weight.

## Vision

[ASSUMPTION] If it works at one Mart, it becomes a dependable daily tool for the owner: stock the owner trusts, sales visible anywhere, and a foundation (suppliers, purchase orders, multiple counters or stores) that grows without a rewrite.
