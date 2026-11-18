# Story 1.6: Manage Branches (backend half)

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, see [[backend-user-implements]]).

**Schema dependency:** the `Branches` column additions (`Location`, `TimeZone`, `IsActive`, `CreatedByUserId`) and the `AddBranchDetailsAndUserBranchId` migration are already specified in `backend-2-1-ad16-branches-permissions-checklist.md` — do that checklist's Migration 2 first (or combine it with this story's migration; your call), not twice. This checklist covers the **endpoints and Mart-settings columns** FR-26 needs on top of that schema.

## Scope (FR-26, epics.md Story 1.6)

- Owner creates, edits and deactivates Branches. Create/deactivate is **Owner-only**; a user holding `manage Branches and devices` (via `RolePermissions`, from the AD-16 slice) can edit the **settings** of Branches they're assigned to (their own `BranchId`), but cannot create or deactivate one.
- Branch fields: `Name`, `Location`, `TimeZone` (default `Asia/Karachi`), plus settings only editable after creation: `CutoverDate` (FR-14) and `StockCheckLocalTime` (default `03:00`, Story 6.5).
- Mart-level settings (new, on `Marts`): `Currency` (default `PKR`), `DefaultTimeZone`, `LongPendingReturnMinutes` (default `30`, FR-19).
- A deactivated Branch cannot sell (enforced later, Epic 4+); its history stays visible to the Owner — no delete path exists anywhere.
- Every create/edit/deactivate/Mart-settings change is written to the Mart's Audit Log via the `AuditLogger` helper from `backend-1-5-checklist.md` — **build Story 1.5 first** (decided 2026-11-18, spine AD-17).
- Two-Mart isolation test extended to cover `Branches`.

## Schema additions (beyond AD-16's checklist)

### `Marts` (altered)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Currency` | `string` | no | default `"PKR"`. |
| `DefaultTimeZone` | `string` | no | IANA zone, default `"Asia/Karachi"` — used for Mart-wide reports (AD-12). |
| `LongPendingReturnMinutes` | `int` | no | default `30` (FR-19). |

### `Branches` (further additions, on top of AD-16's `Location`/`TimeZone`/`IsActive`/`CreatedByUserId`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `CutoverDate` | `DateOnly?` | yes | set once opening stock is loaded (FR-14, Story 6.1) — nullable until then. |
| `StockCheckLocalTime` | `TimeOnly` | no | default `03:00` (Story 6.5). |

## Migration path

One migration, run **after** AD-16's `AddBranchDetailsAndUserBranchId` (or merged into it if you'd rather do one combined Branches migration — a reasonable call given both touch the same table in the same session):

**`AddMartSettingsAndBranchCutover`**
1. `AddColumn Marts.Currency` (default `'PKR'`), `AddColumn Marts.DefaultTimeZone` (default `'Asia/Karachi'`), `AddColumn Marts.LongPendingReturnMinutes` (default `30`).
2. `AddColumn Branches.CutoverDate` (nullable), `AddColumn Branches.StockCheckLocalTime` (default `'03:00'`).

C#-side: extend `Mart.cs` with the 3 new properties; extend `Branch.cs` with `CutoverDate`/`StockCheckLocalTime` (on top of AD-16's additions); `AppDbContext` config for defaults.

## Endpoints

- `POST /api/v1/branches` (Owner-only) — `{ name, location, timeZone }` → creates a `Branch` with `IsActive = true`, `CreatedByUserId` = the signed-in Owner.
- `GET /api/v1/branches` — any signed-in User in this Mart; Owner sees all Branches, a Branch-scoped user sees only their own `BranchId` (prep for the point-4 Branch-selector, though the selector UI itself isn't built here).
- `PUT /api/v1/branches/{id}` (Owner, or a Branch-scoped user with `manage Branches and devices` editing **their own** `BranchId` only) — `{ name?, location?, timeZone?, cutoverDate?, stockCheckLocalTime? }`.
- `POST /api/v1/branches/{id}/deactivate` (Owner-only) — sets `IsActive = false`. No reactivate endpoint specified by FR-26/epics — confirm with the user if one's wanted, or leave it one-way for now.
- `GET /api/v1/mart-settings` / `PUT /api/v1/mart-settings` (Owner-only) — `{ currency, defaultTimeZone, longPendingReturnMinutes }`.

## Tasks

- [x] Confirm with AD-16's checklist which migration order you're using (separate or merged) before starting. AD-16 landed first, already applied separately; this story's migration followed as its own, kept separate per the checklist's default.
- [x] Migration: `AddMartSettingsAndBranchCutover` (or folded into AD-16's Branches migration). Kept separate, matches the checklist's schema table exactly.
- [x] Apply against the local `PosSystem` database.
- [x] `Mart.cs`/`Branch.cs` property additions; `AppDbContext` wiring (with `HasDefaultValue` for `Currency`/`DefaultTimeZone`/`LongPendingReturnMinutes`/`StockCheckLocalTime` so the migration carries real SQL `DEFAULT` constraints).
- [x] `BranchesEndpoints.cs`: create/list/edit/deactivate, with the Owner-only vs. `manage Branches and devices`-and-own-Branch-only split. Added a shared `UserAuthorization` helper (`Modules/Identity/UserAuthorization.cs`) for the Owner-bypass + Permission check, and refactored `StaffEndpoints` onto it too to avoid a third copy of the same logic.
- [x] `MartSettingsEndpoints.cs`: get/update, Owner-only (no Branch-scoped exception - these are Mart-wide).
- [x] Tests: Owner can create/edit/deactivate; a Manager with `manage Branches and devices` can edit their own Branch's settings but not create/deactivate, and cannot edit another Branch's settings; a user without the Permission is refused (same throwaway-custom-Role technique as AD-16's); `TenantIsolationTests` for `Branches` were already added during AD-16 (not duplicated here). 11 `BranchesEndpointTests` + 5 `MartSettingsEndpointTests` added; full suite (84 tests across both projects) passes.

## Decision: no reactivate endpoint

Asked the user directly (checklist flagged this as open) - confirmed **one-way for now**: only `POST /branches/{id}/deactivate` exists, matching what FR-26/epics.md actually specify. A reactivate endpoint can be added later as its own small story if needed.

## Sequencing note

- **Audit Log dependency (resolved):** build `backend-1-5-checklist.md` (Story 1.5 / AD-17) first, then call its `AuditLogger` helper from every endpoint below rather than writing ad-hoc audit rows here.
- **Blocks the Staff screen:** per `backend-2-1-ad16-branches-permissions-checklist.md`'s sequencing flag, staff creation needs at least one Branch to assign into — this story should land before or alongside that slice's frontend half.
