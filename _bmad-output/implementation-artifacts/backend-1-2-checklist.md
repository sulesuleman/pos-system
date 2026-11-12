# Story 1.2 (backend half): owner-implemented checklist

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code.
Story 1.2 is done only when this list and the frontend spec (`spec-1-2-super-admin-sign-in.md`) are both finished.

## Decisions already locked in (from the frontend spec, 2026-11-11)

- Session transport: httpOnly session cookie, set on sign-in, cleared on sign-out. The frontend sends `credentials: 'include'`; the backend owns CORS/cookie attributes (`SameSite`, `Secure`, dev proxy behavior) needed for that to round-trip.
- Endpoint contract, locked in exactly as proposed:
  - `POST /api/v1/super-admin/sign-in` `{ email, password }` → `200` + sets the session cookie on success; `401` with a generic message on bad credentials.
  - `POST /api/v1/super-admin/sign-out` → `204`, clears the session cookie.
  - `GET /api/v1/super-admin/session` → `200` if the session cookie is valid, `401` if not.
- Super Admin accounts exist only via a database seed script (email + hashed password); no UI or API path may create one (per epic-1-context.md).
- Every Super Admin sign-in/out goes to a platform audit log, kept separate from each Mart's own Audit Log (per epic-1-context.md). Full platform audit log coverage (create Mart, suspend, reactivate) lands with later stories; this story only needs sign-in/sign-out entries.

## Tasks

- [x] Super Admin seed script/mechanism: email + hashed password, no in-app creation path.
- [x] Session mechanism: ASP.NET Core Session (framework session), backed by `AddDistributedSqlServerCache` against a `dbo.SessionCache` table in `PosSystem` (created manually via SQL script — `dotnet-sql-cache` tool is unmaintained/broken on current SDK). Cookie name `PosSuperAdminSession`, `HttpOnly`, 30 min idle timeout. `SameSite`/`Secure` deferred to the CSRF item.
- [x] `POST /api/v1/super-admin/sign-in`: validates `{ email, password }`, checks the hashed password, sets the session cookie on success (`200`), returns a generic `401` on bad credentials (never reveals whether the email exists). Implemented in `Modules/Identity/Endpoints/SuperAdminAuthEndpoints.cs`, manually verified end-to-end with curl and a real browser sign-in.
- [x] `POST /api/v1/super-admin/sign-out`: clears the session cookie, returns `204`.
- [x] `GET /api/v1/super-admin/session`: `200` if the session cookie is valid, `401` otherwise.
- [x] CORS / cookie config for local dev: the frontend's Vite dev proxy forwards `/api/` to `http://localhost:5139` (fixed 2026-11-11 — was stale at `:5000`, didn't match the backend's actual `http` launch profile). Confirmed round-tripping — the proxy makes the browser see frontend+API as same-origin in dev, so no CORS policy was needed for this story; a real sign-in through the frontend app succeeded. **Deferred:** the production CORS policy (once frontend/backend may be on different origins) depends on hosting topology, not yet decided — revisit as part of Story 1.8 (hosting/backups), not here.
- [x] CSRF mitigation for the cookie session: `SameSite=Strict` (frontend/backend are same-site in every environment; no cross-site top-level navigation needs the cookie, so a double-submit token is unneeded complexity) plus `SecurePolicy = SameAsRequest` for now (revisit to `Always` once HTTPS is used everywhere, e.g. production) — flagged in `spec-1-2-super-admin-sign-in.md`'s review, finding #6.
- [x] Platform audit log write on every sign-in attempt (success and failure) and every sign-out, per epic-1-context.md's "every Super Admin action... goes to a platform audit log." `PlatformAuditLogEntry` table (`Action`, `SuperAdminId` nullable, `AttemptedEmail` nullable, `IpAddress`, `UserAgent`, `OccurredAtUtc`) added via `AddPlatformAuditLog` migration; general-purpose `Action` string so later Story 1.3/1.7 events (create/suspend/reactivate Mart) reuse the same table. Verified end-to-end: failed sign-in (`SuperAdminId` NULL, `AttemptedEmail` captured), successful sign-in, and sign-out all write correct rows.
- [x] Tests: sign-in success, sign-in bad credentials (generic 401, both wrong-password and unknown-email variants), sign-out clears session, session check reflects cookie validity (with and without a prior sign-in). `backend.Api.Tests/SuperAdminAuthEndpointTests.cs`, 6 tests, all passing; full suite (9 total) green, no regressions. Each test creates/cleans up its own throwaway Super Admin row (doesn't touch or depend on the real seeded account).
- [x] Once these endpoints exist, re-run the frontend's full I/O matrix live (`npm run dev` against the real backend) — the frontend half was only verified against mocks (no backend existed yet); this closes that gap (`spec-1-2-super-admin-sign-in.md`'s review, finding #7). Done via a new Playwright E2E suite (`frontend/e2e/super-admin-sign-in.spec.ts`, 5 tests, all passing) driving the real `npm run dev` app against the real backend — not mocks. Seeds/cleans up its own disposable Super Admin test account (hashed with ASP.NET Core Identity's exact PasswordHasher V3 byte format, verified first with a live curl round-trip). Covers every row of the frozen I/O matrix table. First Playwright setup in this frontend — added `data-testid` attributes (previously zero in the codebase) to `SignInPage`, `SuperAdminArea`, `ManagerShell`'s sign-out button, per user decision to start the testid convention here. `vitest.config.ts` updated to exclude `e2e/` from the Vitest runner (glob collision). Existing Vitest suite (64 tests), typecheck and lint all still green.

## Notes

- Story 1.2 is split like Story 1.1: this file tracks the backend half; `spec-1-2-super-admin-sign-in.md` covers the frontend half (done, see that spec's Tasks & Acceptance).
- No Marts list, create/suspend/reactivate endpoints here — those are Story 1.3/1.7.
