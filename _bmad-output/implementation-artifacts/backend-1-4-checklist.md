# Story 1.4 (backend half): owner-implemented checklist

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, confirmed again 2026-11-17).

Story 1.4 is "Owner activation and login" (FR-25, FR-27, AD-4). Story 1.3 already created the Owner row (unactivated: `PasswordHash` null, `SetupCodeHash`/`SetupCodeExpiresAtUtc` set) and left the `"MartId"` session write for this story to supply — `ITenantContext`/`SessionTenantContext` already read it, nothing writes it yet.

## Decisions locked in (2026-11-17, written into PRD FR-25/FR-27 and spine AD-4/AD-5)

- The Owner (and later a Manager, Epic 2) signs in with **Mart code + email + password** — not Staff ID/PIN. Staff ID + PIN stays exactly as before for Counter-role staff (Cashier etc.); unaffected by any of this.
- **Uniqueness is the (Mart code, email) pair, not email alone** — the same email can be the Owner of one Mart and a staff account of another (or of this one, once Epic 2 adds more account types). Needs a unique index on `(MartId, Email)` on `Owner` (composite, same shape as the existing `(MartId, StaffId)` index from 1.3) — `StaffId` stays on the row (useful for display/audit "who"), it's just no longer the login key.
- **Password rule**: at least 8 characters, containing a number, a special character, an uppercase and a lowercase letter. Validate this in `activate`.
- **This is a credential-format change only** — AD-5's device/read-only rule is unchanged: the Owner gets full read/write only from a Registered Device of a Branch, and the read-only Dashboard/Exceptions Report (§4.9) from anywhere else (home, phone). None of that device/read-only logic is Story 1.4's job to build (Registered Devices is FR-2/Epic 2) — just don't build anything here that would make the Owner's sign-in itself imply unrestricted access from any device. For now, with no Registered Device concept wired up yet, every signed-in Owner session is effectively full access until Epic 2 adds the device check — that's fine for this story, same incremental-build pattern as everything else so far.

## Decisions locked in (2026-11-17, round 2)

- **`PlatformAuditLogEntry`**: add an `AttemptedMartCode` column (new migration), alongside the existing `AttemptedEmail`. Failed Owner sign-in/activation writes both.
- **Mart-suspended check**: `sign-in` and `activate` both check `MartStatus.Suspended` now (one-line guard, generic failure) — this is implementing a slice of FR-25's already-stated suspension behavior early, not a new PRD decision, so no PRD/spine edit needed. Story 1.7 still owns the rest (Counter upload-then-lock, reactivation).
- **`OwnerSetupCodeGenerator.Validity` stays 1 hour.** No change, no PRD conflict (FR-25 never stated a duration for the Owner's setup code specifically).

## Endpoint contract

- `POST /api/v1/owners/activate` `{ martCode, email, setupCode, password }` → `200` on success; `400 { error: "..." }` (single generic message — PRD says "refused with a clear message", and a per-field shape would leak which part of the triple is wrong) on an unknown Mart code/email combination, or a used/expired setup code. **As implemented:** a password that fails the complexity rule gets its own specific message instead of the generic one — deliberate, since complexity isn't part of the Mart/email/setup-code guessing surface the generic message protects; telling the user why their password was rejected is normal, necessary feedback.
- `POST /api/v1/owners/sign-in` `{ martCode, email, password }` → `200 { ownerId, martId, martName, firstName, lastName }` (whatever the Owner area's header/shell actually needs to render) on success, writing `"OwnerId"` and `"MartId"` into session; `401` generic message on any failure (unknown Mart/email, wrong password, unactivated account) — never reveal which part was wrong.
- `POST /api/v1/owners/sign-out` — mirrors `SuperAdminAuthEndpoints`'s shape, minus `AttemptedEmail`/`AttemptedMartCode` on the log entry (decided not worth the extra Owner lookup — sign-out isn't a guessing-attack surface, and "who" is already recoverable from the prior sign-in entry).
- `GET /api/v1/owners/session` → `200 { ownerId, martId, martName, firstName, lastName }` on an active session (same shape as `sign-in`'s success response, not a bare 200 like `SuperAdminAuthEndpoints`'s version) — decided the Owner shell needs those fields back on a page refresh without a second round-trip; `401` otherwise.

## Tasks

- [x] Migration: unique index on `Owner(MartId, Email)`; `AttemptedMartCode` column on `PlatformAuditLogEntry`. Applied: `20261117100312_AddOwnerEmailIndexAndAuditMartCode`.
- [x] `POST /api/v1/owners/activate`: implemented in `OwnerAuthEndpoints.cs` — uppercases `martCode`, checks `Suspended`, looks up `Owner` by `(MartId, Email)` with `.IgnoreQueryFilters()`, verifies setup code hash + used/expired, validates password complexity (own specific error message, see endpoint contract note above), hashes password, stamps `SetupCodeUsedAtUtc`. Not yet done: no `PlatformAuditLogEntry` write on a failed activation attempt — checklist never required one (only "Failed sign-in" does), so this is consistent, just noting it's an open question whether activation failures should also be logged.
- [x] `POST /api/v1/owners/sign-in`: implemented — Mart+Email lookup (`.IgnoreQueryFilters()`) plus suspended-Mart guard collapse into one `owner` variable that's `null` on any of those three failures; explicit `owner.PasswordHash is null` guard before calling `VerifyHashedPassword` (an unactivated Owner has a null hash, which would otherwise throw instead of failing cleanly); on success writes `"OwnerId"` and `"MartId"` into `httpContext.Session` — the first code anywhere that populates `"MartId"`, so every tenant-scoped query from here on starts working through the global filter.
- [x] Failed sign-in: `PlatformAuditLogEntry` with `Action = "OwnerSignInFailed"`, `AttemptedEmail` + `AttemptedMartCode`, logged even when the Mart itself doesn't exist/is suspended (deliberate — makes a brute-force pattern against one Mart code visible).
- [x] `POST /api/v1/owners/sign-out`, `GET /api/v1/owners/session`: implemented, see endpoint contract notes above for the two deviations from a straight `SuperAdminAuthEndpoints` copy.
- [x] Registered in `Program.cs`: `v1.MapOwnerAuthEndpoints()`.
- [x] `dotnet build`: 0 warnings, 0 errors (2026-11-17).
- [x] Tests: `OwnerAuthEndpointTests.cs` (18 tests, all passing; full suite 42/42). Same fresh-throwaway-database-per-test-method pattern as `MartsEndpointTests` — a `CreateMartAndOwnerAsync` helper signs in as the seeded SuperAdmin and hits `POST /marts` to get a real Mart + unactivated Owner + plaintext setup code (no raw DB inserts needed, since `SetupCodeHash` isn't reversible). Covers: activate success/wrong/used/expired setup code/unknown Mart code/unknown email/weak password/suspended Mart; sign-in success-with-shape/wrong password/unknown Mart/unknown email/before activation/suspended Mart/two Owners sharing an email across different Marts signing in independently; session with and without a prior sign-in; sign-out clearing the session.
- [ ] Not covered by an HTTP test yet (and can't be, today): the checklist's "a tenant-scoped query now returns only that Mart's rows" check — there's no Owner-session-protected *read* endpoint yet for anything tenant-scoped (only `/marts`, which is SuperAdmin-only and deliberately bypasses the filter). Revisit once a Story past 1.4 adds the first such endpoint; `TenantIsolationTests` already covers the filter mechanism itself at the DbContext level.

## Notes

- Frontend half (activation screen + Owner sign-in screen) isn't started yet — this checklist is backend-only, same split as 1.1–1.3.
- No Branches (Story 1.6), no Registered Devices (FR-2/Epic 2) yet — the Owner's `Role` stays the fixed `"Owner"` string from 1.3, and nothing in this story enforces the device-based read-only rule (AD-5) since there's no device concept to check against yet.
