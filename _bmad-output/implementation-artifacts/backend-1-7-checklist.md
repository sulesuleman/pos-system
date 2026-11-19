# Story 1.7: Suspend and reactivate a Mart (FR-25)

Owner: Suleman (learning .NET). Per the user's explicit "implement the backend for it as well" instruction (2026-11-19), Claude implemented this slice directly - a one-off exception to the standing arrangement ([[backend-user-implements]]), same as the prior AD-15/AD-16 slices.

## Scope

Super Admin can suspend/reactivate a Mart; every login and already-signed-in API request for a suspended Mart is refused "on next contact" with a distinct "Mart suspended" message; both actions are written to the platform audit log; other Marts are unaffected. Counter upload exemption (Story 7.9) is out of scope - no Counter endpoints exist yet.

No schema change needed - `Mart.Status`/`MartStatus` already existed from Story 1.3's baseline.

## Design

- **`POST /api/v1/marts/{id}/suspend`, `POST /api/v1/marts/{id}/reactivate`** (new, `MartsEndpoints.cs`) - Super Admin-only (same session check as `GetMarts`/`CreateMart`). 404 if the Mart doesn't exist, 400 if already in the requested status. Flips `Mart.Status` and writes a `PlatformAuditLogEntry` (`MartSuspended`/`MartReactivated`, `SuperAdminId`, `AttemptedMartCode` = the Mart's code). Returns the same shape as `GetMarts`' list items (`{ id, name, code, status }`).
- **Fresh sign-in/activate against a suspended Mart** (`AuthEndpoints.cs`): both already had a forward-guard check from the AD-15 slice that lumped "Mart suspended" in with the generic invalid-credentials error. Split out into a distinct `403 { error: "Mart suspended" }` response (`MartSuspendedResult()` helper) - the AC calls for a specific message, and 403 rather than 401/400 because the credentials/request are fine, the Mart itself is the reason. Sign-in's suspended-Mart path also writes a `UserSignInRefusedMartSuspended` platform audit entry.
- **Already-signed-in requests** ("every ... API request ... refused on next contact", not just login): a single middleware in `Program.cs`, registered right after `app.UseSession()`. Reads the session's `"MartId"` (set only for signed-in Users, never Super Admin), looks up the Mart fresh from the DB each request, and short-circuits with `403 { error: "Mart suspended" }` (clearing the session) if it's gone or suspended. This was one choke point instead of threading a check through every Mart-scoped endpoint (`StaffEndpoints`, `BranchesEndpoints`, `MartSettingsEndpoints`, `AuditLogEndpoints`, `AuthEndpoints.GetSession`) individually - `AuthEndpoints.GetSession` additionally double-checks at the handler level since it already had the Mart loaded.
- No change to `UserAuthorization.GetSignedInUserAsync` - the middleware already covers every endpoint that reads the session, including the ones that call it.

## Tasks

- [x] `MartsEndpoints.cs`: `SuspendMart`/`ReactivateMart` handlers + routes.
- [x] `AuthEndpoints.cs`: `MartSuspendedResult()` helper; `ActivateAsync`/`SignInAsync` return it distinctly from the generic error; `GetSession` checks Mart status too.
- [x] `Program.cs`: suspension-check middleware after `UseSession()`.
- [x] Tests (`MartsEndpointTests.cs`): suspend/reactivate require a Super Admin session, flip `Mart.Status`, reject when already in the target status, 404 on an unknown Mart, write the platform audit log entry.
- [x] Tests (`AuthEndpointTests.cs`): updated the two pre-existing forward-guard tests (`Activate_AgainstSuspendedMart_*`, `SignIn_AgainstSuspendedMart_*`) to assert the new 403 + "Mart suspended" shape instead of the old generic 400/401; added a test proving an already-signed-in User is refused on their *next* request after the Mart is suspended mid-session (not just at login); added a test proving suspending one Mart doesn't affect sign-in to another.
- [x] Full suite: **96/96 passing** (84 API + 12 integration), `dotnet build` clean.

## Not done (explicitly out of scope)

- Counter upload exemption during suspension (Story 7.9, Epic 7 - no Counter endpoints exist yet).

## Frontend (2026-11-19)

Added after this checklist's backend slice: `shared/api/marts.ts` gained `suspendMart`/`reactivateMart`; `MartsList` gained a Status chip (Active/Suspended) and a per-row action (Suspend with a confirm dialog mirroring Branches' own Deactivate confirm, since it blocks every sign-in for that Mart; Reactivate runs directly, with its own pending spinner, since it's reversible/low-risk). `SuperAdminArea` owns the confirm dialog + pending/error state and refreshes the list on success. Verified against a running dev server with a stubbed backend (suspend -> confirm -> spinner -> chip flips; reactivate -> spinner -> chip flips) and with unit tests.
