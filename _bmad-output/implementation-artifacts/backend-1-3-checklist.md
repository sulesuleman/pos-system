# Story 1.3 (backend half): owner-implemented checklist

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code.
Story 1.3 is done only when this list and the frontend spec (`spec-1-3-register-a-mart-and-its-owner-with-tenant-isolation.md`) are both finished. Per the epic, this story also creates the central tenant filter and isolation test every later tenant table relies on.

## Decisions already locked in (from the frontend spec, 2026-11-11)

- Endpoint contract, locked in exactly as proposed:
  - `GET /api/v1/marts` → `200` `[{ id, name, code, status }]`.
  - `POST /api/v1/marts` `{ martName, ownerName, ownerContact }` → `201` `{ martId, martCode, ownerStaffId, setupCode }` on success; `400` `{ errors: { martName?, ownerName?, ownerContact? } }` (per-field messages) when required fields are missing; a generic error on any other failure.
- Both endpoints are Super Admin-only (same session cookie mechanism as Story 1.2); the Super Admin API never exposes a Mart's sales, stock, staff activity or Audit Log — only `{ id, name, code, status }`.
- "Owner contact" is free-text (not validated as an email or phone number), just required/non-empty.
- Creating a Mart produces: a unique 6-character Mart code (letters and digits, never `0`, `O`, `1` or `I`), an Owner account with a Mart-unique numeric Staff ID, and a one-time setup code (used once, with an expiry).
- One Owner per Mart, holding every Permission; the Owner's Role can never be edited down (per epic-1-context.md — Roles/Permissions themselves are an Epic 2 concept, but this constraint is recorded now since the Owner account is created here).
- Every Super Admin "create Mart" action goes to the platform audit log (separate from each Mart's own Audit Log), per epic-1-context.md.

## Tasks

- [ ] Mart entity/table: `Id`, `Name`, `Code` (unique, 6-char, excludes `0`/`O`/`1`/`I`), `Status` (active/suspended — suspend/reactivate itself is Story 1.7, but the column and default `active` value belong here).
- [ ] Owner account entity/table: belongs to exactly one Mart, Mart-unique numeric `StaffId`, hashed password (not yet set — activation is Story 1.4), holds every Permission, Role fixed/non-downgradable.
- [ ] Mart code generator: unique 6-character code, letters+digits, excluding `0`, `O`, `1`, `I`; retries on collision.
- [ ] Owner Staff ID generator: numeric, unique within the Mart.
- [ ] One-time setup code: generated on Mart creation, stored hashed or single-use-marked, with an expiry; "used or expired" refusal path is consumed by Story 1.4 (Owner activation), not this story — this story only issues it.
- [ ] **EF Core global query filter**: every tenant-owned table carries `MartId` (plus `BranchId` where branch-scoped); isolation comes only from EF Core global query filters, never hand-written unfiltered queries. Apply the filter to `Mart`-scoped entities starting with the Owner account table introduced here.
- [ ] **Automated two-Mart isolation test in CI**: fails the build on any cross-Mart read or write; must cover every new tenant table, including this story's Owner account table (and Branches, per epic-1-context.md, once Branches exist in Story 1.6 — add incrementally).
- [ ] `GET /api/v1/marts`: Super Admin session required; returns `[{ id, name, code, status }]` only — no business data.
- [ ] `POST /api/v1/marts`: validates `{ martName, ownerName, ownerContact }` all non-empty, returns `400` with per-field messages on any missing field; on success, creates the Mart + Owner account + setup code in one transaction, returns `201` `{ martId, martCode, ownerStaffId, setupCode }`.
- [ ] Duplicate Mart name: return `400 { errors: { martName: "A Mart with this name already exists." } }` (or similar) using the same per-field-error shape as the missing-field case — the frontend dialog already renders whatever message this field carries, no frontend change needed (flagged in `spec-1-3-register-a-mart-and-its-owner-with-tenant-isolation.md`'s review, finding #7).
- [ ] Platform audit log write on every successful "create Mart" (who/Super Admin, what, when UTC, from which device/browser), per epic-1-context.md's audit log shape; written in the same transaction as the Mart/Owner creation.
- [ ] Tests: list Marts (empty + populated), create Mart success (fields generated correctly, code format, uniqueness), create Mart validation errors (each missing field), the two-Mart isolation test itself.
- [ ] Once these endpoints exist, re-run the frontend's full I/O matrix live (`npm run dev` against the real backend) — the frontend half was only verified against mocks (no backend existed yet).

## Notes

- Story 1.3 is split like Stories 1.1/1.2: this file tracks the backend half; `spec-1-3-register-a-mart-and-its-owner-with-tenant-isolation.md` covers the frontend half.
- No suspend/reactivate (Story 1.7), no Owner login/activation (Story 1.4), no Branches (Story 1.6) here — this story only creates the Mart, the Owner account record, and the tenancy foundation (global query filter + isolation test) those stories build on.
