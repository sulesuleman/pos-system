# Epic 2 Story 2.1 continued (AD-16): Branches, Permissions and Users.BranchId

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, same as [[backend-1-4-checklist]] and the prior [[backend-2-1-2-2-2-3-checklist]]).

Scope: extend the `Users`/`Roles` slice built 2026-11-17 (AD-15) to match AD-16 (decided 2026-11-18, see spine): a real `Permissions` model, a `Branches` table actually usable (it exists since Story 1.1's baseline but is bare), and `Users.BranchId` so Manager/other-Role accounts are scoped to one Branch. Still **not** in scope: the full custom-Role CRUD UI (choosing an arbitrary Permission subset and naming a Role), Registered Devices, Branch management screens (create/edit/deactivate Branch itself — Story 1.6).

## Decisions locked in (2026-11-18, see spine AD-16)

- A `User` belongs to **at most one Branch per Mart** (`Users.BranchId`, nullable — `null` = Owner/Mart-wide). Not a many-to-many Branch assignment. A person in a second Mart needs a second `User` row (already possible today via the `(MartId, Email)` unique index) — no schema change needed for that case.
- **New `Permissions` table**: the 14 fixed items from PRD FR-1 (`sell`, `request Return`, `approve Return`, `manage Products`, `manage Deliveries`, `manage suppliers`, `run Spot Counts`, `close Shifts`, `view dashboard`, `view Exceptions Report`, `view Audit Log`, `manage staff and Roles`, `reset PINs`, `manage Branches and devices`), seeded via `HasData`, not Mart-customizable at this level.
- **New `RolePermissions` join** (`RoleId`, `PermissionId`, composite PK). Seeded: Manager = every Permission except `view dashboard`; Cashier = `sell` + `request Return`. Owner gets **no** rows — Owner access stays the existing identity-check bypass (`RoleId == RoleIds.Owner`), not a Permission lookup.
- `Branches` (table already exists, bare: `Id`, `MartId`, `Name`, `CreatedAtUtc`) gains `Location`, `TimeZone` (IANA, default `Asia/Karachi`), `IsActive` (default `true`), `CreatedByUserId` (FK → `Users.Id`, `SetNull` — a Branch must survive its creator being deleted, unlike `Users.CreatedByUserId`'s `Restrict`).
- `POST /staff` stops the hardcoded `RoleId == RoleIds.Owner` check (`StaffEndpoints.RequireOwnerAsync`) and instead checks the signed-in User holds `manage staff and Roles` — Owner passes automatically via the bypass, so Owner behavior is unchanged; a Manager with that Permission can now also create staff.
- New-staff `BranchId`: if the creator has a `BranchId` (Branch-scoped), the new staff row gets that same `BranchId`, no choice offered. If the creator is Owner (`BranchId == null`), the request must carry a `branchId` chosen from the Owner's current Branch-selector selection (frontend concern — the endpoint just validates the given `branchId` belongs to this Mart and is active).
- **Consequence accepted, not deferred:** because a non-Owner can never hold more than one Branch, Mart-wide Permission checks (Products, Mart price, suppliers, Roles, Audit Log) are Owner-only in any Mart with 2+ Branches. No code needs to implement "holds it in every active Branch" — that rule is superseded.

## Schema

### `Permissions` (new table)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `Guid` | no (PK) | Fixed well-known GUIDs (a `PermissionIds` static class), seeded via `HasData`. |
| `Name` | `string` (`nvarchar(100)`) | no | One of the 14 fixed names from FR-1, e.g. `"sell"`, `"manage Products"`. |

- Unique index on `Name`.
- No `MartId` — this table is global/fixed, never Mart-customized (only which Permissions a Role bundles is customizable, later).

### `RolePermissions` (new join table)

| Column | Type | Notes |
|---|---|---|
| `RoleId` | `Guid` | FK → `Roles.Id`, `Cascade` (deleting a custom Role drops its grants; the 3 built-in Roles are never deleted). |
| `PermissionId` | `Guid` | FK → `Permissions.Id`, `Restrict`. |

- Composite PK `(RoleId, PermissionId)`.
- Seed rows: Manager × 13 Permissions (all except `view dashboard`), Cashier × 2 (`sell`, `request Return`). Owner: none.

### `Branches` (existing table, altered)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `Guid` | no (PK) | unchanged. |
| `MartId` | `Guid` | no | unchanged (FK → `Marts.Id`). |
| `Name` | `string` | no | unchanged. |
| `Location` | `string` | **new, required** | free-text address/location, per FR-26. |
| `TimeZone` | `string` | **new, required** | IANA zone, default `"Asia/Karachi"` (AD-12, NFR-11). |
| `IsActive` | `bool` | **new, required** | default `true`. |
| `CreatedByUserId` | `Guid?` | **new** | FK → `Users.Id`, `SetNull`. |
| `CreatedAtUtc` | `DateTime` | no | unchanged. |

- No existing rows today (table has always been empty — no Branch-creation UI exists yet), so the new required columns need no backfill, just defaults for the migration.

### `Users` (altered)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `BranchId` | `Guid?` | **new, yes** | FK → `Branches.Id`, `Restrict`. `null` = Owner/Mart-wide. All 3 live rows today are Owners → stay `null`, no backfill needed. |

- New non-unique index on `BranchId`.

## Migration path

Two migrations (incremental, matching this repo's convention):

**Migration 1 — `AddPermissionsAndRolePermissions`**
1. `CreateTable Permissions`, `HasData` seed the 14 rows.
2. `CreateTable RolePermissions`, `HasData` seed Manager's 13 + Cashier's 2 rows.

**Migration 2 — `AddBranchDetailsAndUserBranchId`**
1. `AddColumn Branches.Location` (required — no existing rows, so no two-step nullable-then-required needed), `AddColumn Branches.TimeZone` (default `'Asia/Karachi'`), `AddColumn Branches.IsActive` (default `1`), `AddColumn Branches.CreatedByUserId` (nullable).
2. `AddForeignKey Branches.CreatedByUserId → Users.Id` (`SetNull`).
3. `AddColumn Users.BranchId` (nullable).
4. `AddForeignKey Users.BranchId → Branches.Id` (`Restrict`).

C#-side: add `Permission.cs`, `PermissionIds.cs`, `RolePermission.cs` (or a `Roles.cs`/`Permissions.cs` config-only join if EF's convention-based many-to-many is preferred — decide when building); extend `Branch.cs` with the 4 new properties; add `BranchId` to `User.cs`; in `AppDbContext`, add the new `DbSet`s/config, extend `Entity<Branch>()` config, add `Users.BranchId` FK config.

## Endpoint changes

- `StaffEndpoints.RequireOwnerAsync` → rename/rewrite to a Permission check (e.g. `RequireCreatorWithStaffPermissionAsync`): looks up the signed-in User, passes if `RoleId == RoleIds.Owner` **or** their Role (via `RolePermissions`) includes `manage staff and Roles`.
- `CreateStaffRequest` gains an optional `BranchId` (required when the creator is Owner, ignored/overridden to the creator's own `BranchId` when the creator is Branch-scoped). Validate the given `BranchId` belongs to the current Mart and `IsActive`.
- `GetStaff` response gains each staff member's `branchId`/Branch name (join to `Branches`), so the Staff screen can show it.

## Tasks

- [x] Migration 1: `Permissions`/`RolePermissions` tables + seed data.
- [x] Migration 2: `Branches` columns + `Users.BranchId`. Combined into one migration (`AddPermissionsRolePermissionsAndBranchDetails`) since both were written into the model before either was generated — `dotnet ef migrations add` diffs against the current model regardless of call order, so a second `add` produced an empty migration; removed both and regenerated as one, per this checklist's own "a reasonable call" allowance.
- [x] Apply both against the local `PosSystem` database; confirm the 3 live Owner rows keep `BranchId = null`. Only 1 live Owner row existed at apply time (test data churn since this checklist was written); confirmed it kept `BranchId = null`.
- [x] `Permission.cs`, `PermissionIds.cs`, `RolePermission.cs`/config; `AppDbContext` wiring.
- [x] Extend `Branch.cs` (`Location`, `TimeZone`, `IsActive`, `CreatedByUserId`); add `User.BranchId`.
- [x] Rewrite `StaffEndpoints`'s Owner-only check into a `manage staff and Roles` Permission check (Owner still passes via the identity bypass).
- [x] Extend `CreateStaffRequest`/`CreateStaff` for the Branch-assignment rule above; extend `GetStaff`'s response shape.
- [x] Tests: a Manager holding `manage staff and Roles` can create staff; one without it cannot (built a throwaway custom Role with no `RolePermissions` row, since there's no custom-Role CRUD UI yet); new staff gets the creator's `BranchId` when the creator is Branch-scoped; Owner must supply a valid, active `BranchId` in this Mart or the request is rejected (both "missing" and "inactive" cases tested); `TenantIsolationTests` extended to cover `Branches` (three tests, mirroring `Users`'/`AuditLogEntries`' pattern) and documents that `Permissions`/`RolePermissions` are deliberately global/unfiltered.

## Incidental finding: `Branches` had no tenant query filter at all

While wiring `Branch`'s `AppDbContext` config for this slice, found that `Branch` had **never** had a `HasQueryFilter` configured — a pre-existing AD-2 gap (though not yet exploitable via any shipped endpoint, since no Branch-reading endpoint existed before this checklist). Added `HasQueryFilter(br => br.MartId == _currentMartId)` alongside the other changes here; covered by the new `Branches_*` `TenantIsolationTests`.

## Notes

- This checklist deliberately does **not** cover: Branch create/edit/deactivate screens (Story 1.6 — still needed before an Owner has any Branch to assign staff into!), the Owner's Branch-selector UI, custom-Role CRUD (choosing a Permission subset and naming a Role), or Registered Devices.
- **Sequencing flag:** staff creation now requires at least one `Branch` to exist and be selectable, but nothing yet lets the Owner create one. Story 1.6 (Manage Branches) should land before or alongside this slice's frontend half, not after it — otherwise the Staff screen has no Branch to offer the Owner's dropdown.
