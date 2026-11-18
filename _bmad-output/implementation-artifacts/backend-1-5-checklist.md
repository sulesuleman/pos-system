# Story 1.5: Mart Audit Log (backend half)

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, see [[backend-user-implements]]).

**Must land before Story 1.6's endpoints** (decided 2026-11-18): FR-26 requires every Branch/Mart-settings change to be audited, and this is the only thing that provides that.

## Scope (FR-20, spine AD-17)

- One append-only `AuditLogEntries` table, Mart-scoped, shared by every feature (not a table per entity type).
- No update/delete path exists anywhere in the API — the immutability mechanism is simply never building one.
- Entry written in the **same transaction** as the change it audits.
- Old/new values captured as JSON, only the changed fields.
- `GET /api/v1/audit-log` (Owner, or `view Audit Log` Permission once `RolePermissions` exists from the AD-16 slice — until then, Owner-only is fine since no other Role exists yet with real Permission checks wired up): filter by date range, `UserId`, `EntityType`; newest first.

## Schema

### `AuditLogEntries` (new table)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `Guid` | no (PK) | |
| `MartId` | `Guid` | no | FK → `Marts.Id`, `Restrict`. |
| `UserId` | `Guid` | no | FK → `Users.Id`, `Restrict` — who made the change. |
| `EntityType` | `string` (`nvarchar(100)`) | no | e.g. `"Branch"`, `"MartSettings"`, `"User"`, `"Role"`. |
| `EntityId` | `Guid?` | yes | null for Mart-wide settings changes with no separate entity id. |
| `Action` | `string` (`nvarchar(50)`) | no | e.g. `"Created"`, `"Updated"`, `"Deactivated"`. |
| `OldValuesJson` | `string?` | yes | JSON of just the changed fields' old values; null on `"Created"`. |
| `NewValuesJson` | `string?` | yes | JSON of just the changed fields' new values; null on `"Deactivated"` if nothing else changed. |
| `OccurredAtUtc` | `DateTime` | no | |
| `UserAgent` | `string?` | yes | |
| `IpAddress` | `string?` | yes | |

- Query filter: `HasQueryFilter(a => a.MartId == _currentMartId)` — same pattern as `Users`.
- Index on `(MartId, OccurredAtUtc)` for the newest-first listing; index on `(MartId, UserId)` and `(MartId, EntityType)` for the filters.

## Migration path

**`AddAuditLogEntries`** — one migration, `CreateTable AuditLogEntries` with the FKs/indexes above. No existing data to migrate.

C#-side: `AuditLogEntry.cs`; `AppDbContext`: `DbSet<AuditLogEntry>`, query filter, indexes; a small helper (e.g. `AuditLogger.Record(db, martId, userId, entityType, entityId, action, oldValues, newValues, httpContext)`) that endpoints call right before `SaveChangesAsync`, so the entry always lands in the same transaction as the change — avoid each endpoint hand-rolling the JSON-diff logic separately.

## Endpoints

- `GET /api/v1/audit-log` (Owner-only for now) — query params `from`, `to`, `userId?`, `entityType?`; returns entries newest first, joined to `Users` for a display name.

## Tasks

- [x] Migration: `AddAuditLogEntries`.
- [x] Apply against the local `PosSystem` database.
- [x] `AuditLogEntry.cs`; `AppDbContext` wiring.
- [x] `AuditLogger` helper (or equivalent) for "add an entry to this DbContext before you save" call sites.
- [x] `AuditLogEndpoints.cs`: `GET /audit-log` with the filters above.
- [x] Tests: an entry's `MartId`/`UserId`/`EntityType`/`Action` round-trip correctly; the two-Mart isolation test covers `AuditLogEntries`; no PUT/DELETE route exists for this table (a negative test, same as the Super Admin's "no create path" test in Story 1.2).
- [x] Once this lands, go back and wire `AuditLogger` calls into Story 1.6's Branch/Mart-settings endpoints (and anywhere else already shipped that FR-20 says should be audited but isn't yet — check `CreateMart`/`CreateStaff` too, since those predate this table). `CreateMart`'s actor is a Super Admin (already covered by `PlatformAuditLogEntry`, not this table); `CreateStaff` now calls `AuditLogger.Record`. Story 1.6's own endpoints don't exist yet — nothing to wire there until that backend checklist is built.

## Incidental finding (fixed 2026-11-18)

While building this, found and fixed a **real cross-Mart data leak** in the already-shipped `StaffEndpoints.GetStaff`: its `Join` called `.IgnoreQueryFilters()` on the `Roles` side (to let system Roles with `MartId == null` through — unnecessary, since Role's own filter `r.MartId == null || r.MartId == _currentMartId` already allows that). In this EF Core version, calling `IgnoreQueryFilters()` on one side of a `Join` disables the tenant filter for the **entire composed query**, so every signed-in Owner's `GET /staff` was returning every Mart's Owners/staff, not just their own — a genuine AD-2 violation. Fixed by dropping the unneeded call; added a permanent regression test (`GetStaff_IsolatedBetweenMarts_OnlyReturnsOwnMartsOwner`). `AuditLogEndpoints.GetAuditLog` was written from scratch without ever using `IgnoreQueryFilters()` on its `Users` join, so it was never affected — but watch for this pattern (`IgnoreQueryFilters()` + `Join`) anywhere else in the codebase going forward.

## Notes

- Every **future** audited write (Roles, Permissions, staff disable/reset, Registered Devices, etc.) calls the same `AuditLogger` helper — this table is meant to be the one and only audit mechanism for Mart-level data, never duplicated per feature.
