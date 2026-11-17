# Epic 2 Stories 2.1/2.2/2.3 (backend half, minimal slice): Users/Roles schema + Manager creation/activation/login

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, same as [[backend-1-4-checklist]]).

Scope (explicitly decided 2026-11-17, see spine AD-15 and epics.md notes on Stories 2.2/2.3): build enough of Epic 2 to get Manager accounts created, activated and signed in — **without** Branch assignment (Branches/Story 1.6 don't exist yet) and **without** the full custom-Role/Permission CRUD system (that's the rest of Story 2.1, still backlog). Counter-role (Cashier, Staff ID + PIN) is untouched and still fully backlog.

## Decisions locked in (2026-11-17)

- **Replace `Owner` with a generic `Users` table** (every Role: Owner, Manager, later Counter-role) **plus a new `Roles` table** (built-in + future per-Mart custom Roles) — not a one-off `Manager` table. User's explicit call, overriding Claude's initial recommendation (a separate Manager table) in favor of the more general shape.
- **Migration strategy: rename `Owners` → `Users` in place**, not create-new-and-copy. Nothing holds a real FK into `Owners.Id` today (`PlatformAuditLogEntry` stores `AttemptedEmail`/`AttemptedMartCode` as plain strings, not an Owner FK), so this is safe and preserves the one live Mart's ("Imtiaz Cash and Carry") existing Owner row and its `Id`.
- **Owner's and Manager's activate/sign-in endpoints are generalized into one shared implementation** (`POST /auth/activate`, `POST /auth/sign-in` — replacing `/owners/activate`, `/owners/sign-in`), not duplicated as separate `/managers/*` routes. User's explicit reasoning: the flow is identical for both Roles, differing only in which Role the found User has, so there's no reason to design the routes separately. `POST /auth/sign-out`, `GET /auth/session` also move under `/auth/*` for the same reason (the frontend's `/auth/sign-in`/`/auth/activate` route names already anticipated this). Counter-role's Staff ID + PIN login (FR-27, not built) stays its own separate endpoint once built — structurally different, no email, no setup code.
- All other open points from the schema design were accepted as recommended (see spine AD-15 for the full rationale on each):
  - `Users.RoleId` is a required FK to `Roles.Id`, `Restrict` on delete. No denormalized Role-name column — a display name is a join to `Roles.Name`.
  - Old `Role` string column on `Owner` is dropped in the same migration that adds `RoleId` (not kept around deprecated).
  - `Contact`/`Cnic` stay required for every Role, including future Cashiers.
  - `PinHash` (nullable, unused) is added now on `Users`, reserved for Epic 2's Counter-role PIN work, so that table isn't altered twice.
  - No new FK constraint from `Users.MartId` → `Marts.Id` — out of scope, consistent with no child table having one today.
  - No extra filtered unique index guarding the 3 global Role names — seeded once via migration `HasData`, not through app code, so the risk is covered by code review already.

## Schema

### `Roles` (new table)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `Guid` | no (PK) | Fixed well-known GUIDs for the 3 built-in roles (a `RoleIds` static class: `Owner`, `Manager`, `Cashier`), seeded via `HasData`. |
| `MartId` | `Guid?` | yes | `null` = built-in/global role (shared by every Mart). Non-null = a Mart's own custom role (FR-1, not built now, but the column must exist). |
| `Name` | `string` (`nvarchar(100)`) | no | "Owner", "Manager", "Cashier", or a Mart-defined custom name. |
| `IsSystemDefault` | `bool` | no | `true` for the 3 seeded rows. |
| `CreatedAtUtc` | `DateTime` | no | |

- Filtered unique index `(MartId, Name) WHERE MartId IS NOT NULL` — custom-role-name uniqueness per Mart, without constraining the 3 global rows.
- Query filter: `HasQueryFilter(r => r.MartId == null || r.MartId == _currentMartId)` — a Mart must see its own custom roles *and* the global ones.

### `Users` (renamed from `Owners`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `Guid` | no (PK) | unchanged from `Owner.Id`. |
| `MartId` | `Guid` | no | unchanged. |
| `StaffId` | `int` | no | unchanged — one per-Mart sequence shared across all Roles (also the Counter-role login identifier, FR-27). `StaffIdGenerator` just needs to query `Users` instead of `Owners`. |
| `RoleId` | `Guid` | no (FK → `Roles.Id`, `Restrict`) | Replaces the old `string Role`. |
| `FirstName` | `string` | no | unchanged. |
| `LastName` | `string` | no | unchanged. |
| `Email` | `string?` (`nvarchar(450)`) | **yes** (was required) | Required in practice for Owner/Manager; `null` for Counter-role (Staff ID + PIN, no email). |
| `Contact` | `string` | no | unchanged. |
| `Cnic` | `string` | no | unchanged. |
| `PasswordHash` | `string?` | yes | unchanged — null until activation; stays null forever for Counter-role. |
| `PinHash` | `string?` | yes | **New.** Reserved for Epic 2's Counter-role PIN login — unused by any code today. |
| `SetupCodeHash` | `string?` | **yes** (was required) | Owner/Manager activation only. |
| `SetupCodeExpiresAtUtc` | `DateTime?` | **yes** (was required) | same reasoning. |
| `SetupCodeUsedAtUtc` | `DateTime?` | yes | unchanged. |
| `CreatedByUserId` | `Guid?` | yes (FK → `Users.Id`, self-referencing, `SetNull`) | **New.** Which User created this one (e.g. the Owner who created a Manager). |
| `CreatedAtUtc` | `DateTime` | no | unchanged. |

- Unique `(MartId, StaffId)` — carried over.
- Unique `(MartId, Email)` — carried over; `Email` nullable now, SQL Server already treats `NULL`s as distinct so this allows unlimited Counter-role rows with `Email = NULL`.
- New non-unique index on `RoleId`.
- Query filter: `HasQueryFilter(u => u.MartId == _currentMartId)` — unchanged from today's `Owner` filter, repointed at `User`.

## Migration path

Two migrations (this repo's existing convention: incremental, single-purpose):

**Migration 1 — `AddRolesTable`**
1. `CreateTable Roles` as above.
2. `HasData` seed exactly 3 rows: Owner / Manager / Cashier, fixed GUIDs, `MartId = null`, `IsSystemDefault = true`.

**Migration 2 — `ConvertOwnersToUsers`**
1. `RenameTable` `Owners` → `Users`.
2. `RenameIndex` `IX_Owners_MartId_StaffId` → `IX_Users_MartId_StaffId`, `IX_Owners_MartId_Email` → `IX_Users_MartId_Email`.
3. `AddColumn RoleId` (nullable for now — can't add a required FK column to a table with existing rows in one step).
4. `AddColumn PinHash`, `AddColumn CreatedByUserId` (both nullable, no backfill needed).
5. `migrationBuilder.Sql("UPDATE Users SET RoleId = '<seeded-Owner-RoleId-guid>' WHERE RoleId IS NULL")` — backfills the one existing live row.
6. `AlterColumn RoleId` → `NOT NULL`.
7. `AlterColumn Email` → nullable.
8. `AlterColumn SetupCodeHash` → nullable, `AlterColumn SetupCodeExpiresAtUtc` → nullable.
9. `DropColumn Role` (old string column).
10. `AddForeignKey Users.RoleId → Roles.Id` (Restrict), `AddForeignKey Users.CreatedByUserId → Users.Id` (SetNull).

C#-side: rename `Owner.cs` → `User.cs` (class + namespace unchanged otherwise), add `Role.cs`; in `AppDbContext`, replace `DbSet<Owner> Owners` with `DbSet<User> Users`, add `DbSet<Role> Roles`, move the `HasQueryFilter`/`HasIndex` calls from `Entity<Owner>()` to `Entity<User>()`, add the new `Entity<Role>()` config + query filter above; update `StaffIdGenerator` to query `db.Users`; update `MartsEndpoints` to construct a `User` with `RoleId = RoleIds.Owner` instead of `Role = "Owner"`.

## Endpoint contract

Rename/generalize `OwnerAuthEndpoints.cs` → e.g. `AuthEndpoints.cs`, routes `/owners/*` → `/auth/*` (matches the frontend's already-renamed `/auth/sign-in`, `/auth/activate` routes — no frontend route rename needed this time, just the backend catching up):

- `POST /api/v1/auth/activate` `{ martCode, email, setupCode, password }` → unchanged behavior from today's `/owners/activate`, just looks up `Users` instead of `Owners` (role-agnostic — doesn't care whether the found User is an Owner or a Manager).
- `POST /api/v1/auth/sign-in` `{ martCode, email, password }` → unchanged behavior, looks up `Users`. Session now stores `"UserId"` (was `"OwnerId"`) and `"MartId"`. **Response shape needs one more field than Owner's did:** `{ userId, martId, martName, firstName, lastName, role }` — `role` (the Role's `Name`, e.g. `"Owner"` or `"Manager"`) lets the frontend pick the right nav/landing area and lets a later Epic 2 story apply AD-5's Role-specific device rule (Owner vs Manager differ there). Needs a join to `Roles` to get the name.
- `POST /api/v1/auth/sign-out`, `GET /api/v1/auth/session` → same rename/generalization; `GET /auth/session`'s response also gains `role` for the same reason.
- **New: `POST /api/v1/staff`** (Owner-authenticated only — enforcing that is itself worth a test) `{ firstName, lastName, email, contact, cnic }` → creates a `User` with `RoleId = RoleIds.Manager`, auto-generated `StaffId`, generated `SetupCodeHash`/expiry, `PasswordHash = null`, `CreatedByUserId` = the signed-in Owner's `Id`. Returns `{ userId, staffId, setupCode }` (one-time reveal, same shape as `CreateMart`'s Owner reveal). No `BranchId` — Branch assignment is explicitly deferred.
- **New: `GET /api/v1/staff`** (Owner-authenticated) → lists this Mart's Users (joined to `Roles.Name`) for display on the Staff screen. Decide on request: include the Owner's own row in the list, or just staff they created?

## Tasks

All done 2026-11-17. Per the user's explicit "do everything yourself" instruction, Claude implemented this slice directly (one-off exception to the standing arrangement — see [[backend-user-implements]]).

- [x] Migration: `AddRolesAndConvertOwnersToUsers` — one migration, not two (EF scaffolds the whole model diff in one shot once the C# model already reflects both changes; splitting it would've meant juggling two half-migrated model states). Scaffolded once, then hand-edited: the auto-generated `Up()` did `DropTable("Owners")` + `CreateTable("Users")` (data loss on the live row), rewritten to `RenameTable` + `AddColumn`(nullable) + SQL backfill + `AlterColumn`(not-null) + `DropColumn("Role")`, matching the checklist's planned rename-in-place strategy. Designer/snapshot hand-patched to match; `dotnet ef migrations has-pending-model-changes` confirms no drift.
- [x] Applied against the local `PosSystem` database — confirmed live: all 3 existing Owner rows (including Imtiaz Cash and Carry, Mart code `NE3HWF`) backfilled to `RoleId = RoleIds.Owner`, the already-activated one keeping its `PasswordHash`.
- [x] `User.cs` (renamed from `Owner.cs`), `Role.cs`, `RoleIds.cs`.
- [x] `AppDbContext`: `DbSet<User>`, `DbSet<Role>`, query filters (`Role`'s is `MartId == null || MartId == _currentMartId` — global roles visible everywhere), indexes, FK configuration. **One deviation from the plan:** `CreatedByUserId`'s FK uses `DeleteBehavior.Restrict`, not the planned `SetNull` — SQL Server rejected `ON DELETE SET NULL` on a self-referencing FK combined with the `RoleId` FK on the same table ("may cause cycles or multiple cascade paths"). Restrict is consistent with `RoleId`'s own FK and arguably safer (deleting a User who created others is blocked loudly, not silently nulled out).
- [x] `StaffIdGenerator` repointed at `db.Users`.
- [x] `SetupCodeGenerator` (renamed from `OwnerSetupCodeGenerator`, now `PasswordHasher<User>`).
- [x] `MartsEndpoints.CreateMart` repointed at `User`/`RoleId = RoleIds.Owner`.
- [x] `AuthEndpoints.cs` (renamed from `OwnerAuthEndpoints.cs`): `activate`/`sign-in`/`sign-out`/`session` role-agnostic against `Users`; session keys `"UserId"`/`"MartId"`; `sign-in`/`session` responses gain `role` (joined from `Roles.Name`). Routes moved `/owners/*` → `/auth/*`.
- [x] `Program.cs`: `v1.MapOwnerAuthEndpoints()` → `v1.MapAuthEndpoints()`, added `v1.MapStaffEndpoints()`.
- [x] `StaffEndpoints.cs`: `POST /api/v1/staff` (Owner-only — checks the signed-in User's `RoleId == RoleIds.Owner`, not just "is signed in"; creates a `User` with `RoleId = RoleIds.Manager`, `CreatedByUserId` = the Owner) and `GET /api/v1/staff` (Owner-only, lists the Mart's Users joined to Role name — **decided:** includes the Owner's own row, since there was no reason to hide it and the test asserts both appear).
- [x] Tests: `AuthEndpointTests.cs` (renamed from `OwnerAuthEndpointTests.cs`, all prior coverage repointed at `/auth/*`/`Users`) plus new: a Manager activates/signs in through the identical shared endpoints and gets `role: "Manager"` back; `POST /staff` rejects no session and rejects a signed-in Manager (Owner-only enforcement); `GET /staff` lists both the Owner and a created Manager. `TenantIsolationTests.cs` repointed at `Users`. Full suite: **51/51 passing** (46 API + 5 integration), `dotnet build` clean, live route smoke-check against the real dev server confirms `/auth/*`/`/staff` exist and reject unauthenticated requests while `/owners/*` 404s.
- Not done (explicitly out of scope, per the locked decisions above): Branch assignment, custom-Role/Permission CRUD, Counter-role Staff ID + PIN creation/login.

## Notes

- Frontend half (Staff screen for Owner to create a Manager, Manager sign-in reusing a generalized sign-in screen, Manager's landing area) is next — tracked separately, same split as every prior story. The frontend's `shared/api/ownerAuth.ts`/`OwnerSignInPage.tsx`/`OwnerActivatePage.tsx` need to generalize into role-agnostic equivalents now that the backend serves `/auth/*`, not `/owners/*`.
- Epic 2's remaining scope (full custom-Role/Permission CRUD, Branch assignment, Counter-role Staff ID + PIN creation/login, device registration) stays backlog — this slice only unblocks Manager.
