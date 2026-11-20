# Story 2.5: Disable accounts and reset credentials (FR-1, FR-27)

Owner: Suleman (learning .NET). Per the user's explicit "do it yourself" instruction (2026-11-20), Claude implemented this directly (one-off exception to the standing arrangement - see [[backend-user-implements]]).

## Scope decisions (locked in 2026-11-20, confirmed with the user before coding)

- **Owner/Manager only for now.** Counter-role (Cashier) Staff ID + PIN login doesn't exist yet - only email+password accounts exist. This story covers disable + credential reset for those; Cashier-specific PIN handling gets its own pass once Counter-role login (FR-27) is actually built.
- **Reused the existing `SetupCodeGenerator` as-is** (10-char mixed alphabet, 1-hour validity) for the reset flow, rather than building FR-27's literal "8-digit, 7-day" spec. That mismatch between FR-27's wording and the generator every Owner/Manager activation already uses was flagged back on 2026-11-17 and stays open - fixing it is a separate pre-existing issue, not new scope for this story.
- **Disabled-session enforcement extends the existing Mart-suspension middleware** in `Program.cs` (one choke point checking both conditions) rather than a second separate middleware.

## What was built

- **Schema**: `Users.IsActive` (`bool`, default `true`) via migration `AddUsersIsActive`. Applied to the local DB.
- **`UserAuthorization.IsStrictlyHigherRoleAsync`**: implements the AC's "a Role is lower when its Permissions are a strict subset of the resetter's" generically (via `HashSet.IsProperSubsetOf` over each Role's actual `RolePermissions`, so it works for any future custom Role too, not just the 3 built-ins). The Owner always outranks everyone; nobody (including another nominal "Owner") can ever target the Owner; two Users on the same Role never outrank each other.
- **`POST /staff/{id}/disable`**: Owner, or a User holding `manage staff and Roles` whose Role strictly outranks the target's. Sets `IsActive = false` (one-way, no re-enable endpoint - same convention as `Branch.IsActive`). Branch-scoped actor only ever acts on their own Branch's staff (reuses the Story 2.4 scoping shape). Writes an Audit Log `"Disabled"` entry. 400 if already disabled.
- **`POST /staff/{id}/reset-credentials`**: same authorization shape, gated on `reset PINs` instead. Generates a fresh setup code, clears `PasswordHash`, clears `SetupCodeUsedAtUtc` - the staff member re-activates through the *existing* `/auth/activate` endpoint with the new code, so no separate "reset" activation flow needed to exist. Writes an Audit Log `"CredentialsReset"` entry (no before/after values logged - nothing meaningful to diff). 200 returns `{ setupCode }`, the one-time reveal.
- **`AuthEndpoints`**: `ActivateAsync` and `SignInAsync` both refuse a disabled account - `SignInAsync` treats it exactly like a wrong password (no separate error, doesn't reveal the account exists but is disabled).
- **`Program.cs` middleware**: extended the existing Mart-suspension check to also look up the session's `UserId` and 403 + clear the session if the User is gone or `!IsActive` - ends an already-open session "on next request," not just blocking future sign-ins. Shares a new `AuthEndpoints.UserDisabledMessage` constant, same pattern as `MartSuspendedMessage`.
- **GetStaff response**: renamed `active` → `activated` (has set a password/PIN - unrelated concept) and added `isActive` (the new disabled flag) - both frontend and backend updated together.

## Frontend

- `shared/api/staff.ts`: `StaffMember` gained `isActive`; `active` renamed `activated`. New `disableStaff`/`resetStaffCredentials` clients (never throw, typed `conflict`/`unauthorized`/`error` reasons).
- `StaffList.tsx`: Status chip shows a `"Disabled"` (error/soft) chip before the activated/pending distinction; new Actions column (Reset credentials, Disable) hidden for the Owner's own row and for an already-disabled row - the server, not this screen, is the actual authority on who may act on whom, so a refusal shows as an error message in the confirm dialog rather than the button being conditionally hidden per-row.
- `StaffPage.tsx`: wired both actions through `ConfirmationDialog` (Disable: destructive confirm; Reset: confirm + a one-time reveal dialog for the new setup code, mirroring `CreateStaffDialog`'s own reveal screen).

## Tests

All done 2026-11-20.

- Backend: `UserAuthorization.IsStrictlyHigherRoleAsync` exercised indirectly via 9 new `AuthEndpointTests` cases - disable ends an open session and blocks a fresh sign-in; writes an Audit Log entry; a Manager can disable a lower-Role Cashier but not another Manager (same Branch, isolating the Role-equality refusal from Branch-scoping); already-disabled returns 400; a Branch-scoped Manager can't disable staff in a different Branch (404, Branch-scoping excludes it before the Role check even runs); reset-credentials makes the old password stop working and the new setup code successfully re-activates; a Manager can't reset another same-Branch Manager; a Branch-scoped Manager can't reset the Owner (404, same Branch-scoping reason). Full suite: **108** `backend.Api.Tests` + **12** `backend.IntegrationTests`, all passing (confirmed twice - the first full run hit transient SQL timeouts under load, which a second full re-run came back clean on, unrelated to this story's code).
- Frontend: `staff.test.ts` covers `disableStaff`/`resetStaffCredentials`'s request shape and every typed result; `StaffList.test.tsx` covers the Disabled chip, Owner-row/disabled-row action-hiding, and both action callbacks; `StaffPage.test.tsx` covers the full confirm → API → refresh/reveal flow for both actions, plus the refused-action error message. Full suite: **215** tests, all passing; `tsc --noEmit` and `eslint` both clean.

## Not done (explicitly out of scope)

- Cashier/Counter-role PIN reset and disable (no Counter-role login exists yet).
- Fixing `SetupCodeGenerator` to match FR-27's literal 8-digit/7-day wording (pre-existing, separate issue).
- A re-enable endpoint for a disabled account (one-way, same as `Branch.IsActive` - not asked for by the AC).
