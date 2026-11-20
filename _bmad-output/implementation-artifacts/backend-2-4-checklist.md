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

## Open decisions (resolve before starting)

1. **Audit pass first.** Before writing new checks, grep every `MapGet`/`MapPost`/`MapPut` in `backend.Api` for ones with no `UserAuthorization` call and no explicit Owner-only check — build the actual gap list instead of guessing which endpoints need this.
2. **AC "holds a Permission in some but not all active Branches" is currently unreachable** (one `BranchId` per User, AD-16) — confirm we note this as "not yet applicable, will matter once Epic 3+ Mart-wide entities like Products exist" rather than building dead code for it now.
3. **Test matrix shape** — one parameterized test per (endpoint, Permission) pair, or a smaller set of representative endpoints covering every Permission at least once? Recommend the latter to start (every Permission exercised once, not every endpoint × every Permission), given how few Permission-gated endpoints exist today.

## Tasks (not started)

- [ ] Audit: list every non-Owner-only endpoint and whether it already calls `UserAuthorization`.
- [ ] Add the missing Permission checks found by the audit (likely just `RolesEndpoints`/`PermissionsEndpoints`, per the note above).
- [ ] Add Branch-scoping checks anywhere a request can read/act on a specific Branch's data besides `BranchesEndpoints.EditBranch` (re-check `StaffEndpoints` — can a Branch-scoped Manager list/create staff outside their own Branch today?).
- [ ] Test matrix: each of the 14 Permissions refused without it, allowed with it, against at least one real endpoint; Branch-mismatch refusal test; Owner-bypass-works-everywhere test (already partly covered by existing tests — confirm, don't duplicate).
- [ ] Re-run full suite, confirm no regression in existing `StaffEndpointTests`/`BranchesEndpointTests`/`RolesEndpointTests`.

## Notes

- This story has no new schema/migration — it's authorization logic + tests on top of AD-16's existing `Permission`/`RolePermission`/`Users.BranchId` model.
- Frontend half: none expected beyond what already exists (buttons are already hidden by Permission in the Roles/Staff screens) — this story is server-side hardening, not new UI.
