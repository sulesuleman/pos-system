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

- [ ] Super Admin seed script/mechanism: email + hashed password, no in-app creation path.
- [ ] Session mechanism: httpOnly cookie (framework session, or a signed/opaque token issued as an httpOnly cookie) — decide and record which.
- [ ] `POST /api/v1/super-admin/sign-in`: validates `{ email, password }`, checks the hashed password, sets the session cookie on success (`200`), returns a generic `401` on bad credentials (never reveals whether the email exists).
- [ ] `POST /api/v1/super-admin/sign-out`: clears the session cookie, returns `204`.
- [ ] `GET /api/v1/super-admin/session`: `200` if the session cookie is valid, `401` otherwise.
- [ ] CORS / cookie config for local dev: the frontend's Vite dev proxy forwards `/api/` to `http://localhost:5000`; confirm cookies round-trip through that proxy (and whatever CORS policy is needed once frontend/backend are on different origins outside the proxy, e.g. in deployed environments).
- [ ] CSRF mitigation for the cookie session: choose and implement one (e.g. `SameSite=Strict`/`Lax` plus same-site deployment, or a double-submit/anti-CSRF token) — an httpOnly cookie sent automatically by the browser needs this explicitly decided, not left implicit (flagged in `spec-1-2-super-admin-sign-in.md`'s review, finding #6).
- [ ] Platform audit log write on every sign-in attempt (success and failure) and every sign-out, per epic-1-context.md's "every Super Admin action... goes to a platform audit log."
- [ ] Tests: sign-in success, sign-in bad credentials (generic 401), sign-out clears session, session check reflects cookie validity.
- [ ] Once these endpoints exist, re-run the frontend's full I/O matrix live (`npm run dev` against the real backend) — the frontend half was only verified against mocks (no backend existed yet); this closes that gap (`spec-1-2-super-admin-sign-in.md`'s review, finding #7).

## Notes

- Story 1.2 is split like Story 1.1: this file tracks the backend half; `spec-1-2-super-admin-sign-in.md` covers the frontend half (done, see that spec's Tasks & Acceptance).
- No Marts list, create/suspend/reactivate endpoints here — those are Story 1.3/1.7.
