# Story 2.4: Enforce Permissions and Branch assignment on every request (backend)

Owner: Suleman (learning .NET). Claude tracks this list and explains each step on request, but writes no backend code (standing arrangement, see [[backend-user-implements]]).

## Scope (FR-1, FR-26, NFR-3, AD-5, epics.md Story 2.4)

- Every endpoint that isn't Owner-only must check the signed-in User's Role Permissions server-side, not just hide the button in the UI.
- A user with a `BranchId` can only read/act on their own Branch; the Owner (no `BranchId`) can act on every Branch.
- Mart-wide data (Roles, Mart settings — Products/suppliers don't exist yet) stays change-only by the Owner or someone with the matching Permission acting Mart-wide; a Branch-scoped Permission only ever grants Branch-scoped data today, since AD-16 caps a User at one Branch per Mart (the "holds it in some but not all Branches" case in the AC can't occur yet — see note below).
- CI gets a test matrix: each Permission refused without it, allowed with it.

## What already exists (don't redo)

- `Modules/Identity/UserAuthorization.cs` — Owner-bypass + `RolePermissions` check, already used by `StaffEndpoints` (`manage staff and Roles`) and `BranchesEndpoints` (`manage Branches and devices`, Branch-scoped edit).
- `BranchesEndpoints.EditBranch` already restricts a non-Owner editor to their own `BranchId`.
- `RolesEndpoints`/`PermissionsEndpoints` (added alongside the Epic 2 frontend) — **confirm their own Permission check now**; they were built for the Owner-driven Roles screen and may still be Owner-only by assumption rather than checked against `manage staff and Roles` explicitly.

## Audit (done 2026-11-20)

Read every endpoint file in `backend.Api` (`AuthEndpoints`, `RoleEndpoints`, `StaffEndpoints`, `SuperAdminAuthEndpoints`, `BranchesEndpoints`, `MartsEndpoints`, `MartSettingsEndpoints`, `AuditLogEndpoints`) and classified each route's authorization:

| Endpoint | Check | Verdict |
|---|---|---|
| `GET/POST /roles`, `PUT /roles/{id}`, `GET /permissions` | `UserAuthorization.HasPermissionAsync(..., ManageStaffAndRoles)` | OK |
| `POST/GET /staff` | same Permission check | OK (see gap below on `GET /staff`) |
| `GET /branches` | no Permission needed (read-only); already filters `WHERE b.Id == user.BranchId` when `BranchId != null` | OK, Branch-scoped |
| `PUT /branches/{id}` | `HasPermissionAsync(..., ManageBranchesAndDevices)` **and** `user.BranchId == id` | OK, Branch-scoped |
| `POST /branches`, `POST /branches/{id}/deactivate` | explicit `user.RoleId == RoleIds.Owner` (no Permission grants these to anyone else — matches `epics.md`'s "Create/deactivate are Owner-only") | OK, correctly Owner-only |
| `GET/PUT /mart-settings` | explicit Owner-only (Mart-wide, no Branch exception — correct, nothing Branch-scoped should edit currency/timezone/Mart settings) | OK |
| `GET /audit-log` | `HasPermissionAsync(..., ViewAuditLog)` | OK (Mart-wide by design, no Branch split - Audit Log isn't Branch data) |
| `/auth/*`, `/marts/*`, `/super-admin/*` | pre-session (activate/sign-in) or Super Admin session, not a `User`/`RolePermissions` case at all | out of scope for this story |

**Result: only one real gap**, not the wide rewrite originally expected.

### The gap: `GET /staff` isn't Branch-scoped

`StaffEndpoints.GetStaff` checks the `manage staff and Roles` Permission but returns **every** `User` in the Mart regardless of the caller's own `BranchId`. A Branch-scoped Manager holding that Permission (AD-16 seeds Manager with every Permission except `view dashboard`) can list every other Branch's staff too — the exact case Story 2.4's AC #2 ("a user assigned only to Branch X ... requests data ... for Branch Y ... refused") covers. `BranchesEndpoints.GetBranches` already got this right (`if (user.BranchId is not null) query = query.Where(b => b.Id == user.BranchId)`) - `GetStaff` needs the same shape, filtering on `u.BranchId == user.BranchId` when the caller isn't the Owner. Confirmed no test exercises this today (`AuthEndpointTests.cs`'s staff tests are all Owner-signed-in or permission-less-Role-refused; nothing signs in as a Branch-scoped Manager and calls `GET /staff`).

No other gap found - every other endpoint is already either correctly Permission-checked, correctly Branch-scoped, correctly Owner-only by design, or out of this story's scope.

## Open decisions (resolve before starting)

1. **AC "holds a Permission in some but not all active Branches" is currently unreachable** (one `BranchId` per User, AD-16) — note it as "not yet applicable, will matter once Epic 3+ Mart-wide entities like Products exist" rather than building dead code for it now.
2. **Test matrix shape** — given the audit found only one real gap, the "each of the 14 Permissions refused/allowed" AC is largely already covered by the existing per-feature tests (`RoleEndpointTests`, `StaffEndpoint`-related tests in `AuthEndpointTests.cs`, `BranchesEndpointTests`, `AuditLogEndpointTests` each already assert their own Permission's refuse/allow case). Recommend treating this AC as satisfied by that existing coverage plus the new Branch-scoping test below, rather than writing a redundant parameterized matrix.

## Tasks

- [ ] Fix `StaffEndpoints.GetStaff`: scope the query to `u.BranchId == currentUser.BranchId` when `currentUser.BranchId is not null` (Owner, `BranchId == null`, keeps seeing everyone) — same shape as `BranchesEndpoints.GetBranches`.
- [ ] New test: a Branch-scoped Manager with `manage staff and Roles` calls `GET /staff` and sees only their own Branch's staff (plus, decide: should the Owner's own row ever show to a Branch-scoped Manager, given the Owner has no `BranchId`? Recommend excluding it, consistent with "only their own Branch's data").
- [ ] Re-run full suite, confirm no regression in `AuthEndpointTests`/`BranchesEndpointTests`/`RoleEndpointTests`/`TenantIsolationTests`.

## Notes

- This story has no new schema/migration — it's authorization logic + tests on top of AD-16's existing `Permission`/`RolePermission`/`Users.BranchId` model.
- Frontend half: none expected beyond what already exists (buttons are already hidden by Permission in the Roles/Staff screens) — this story is server-side hardening, not new UI.
