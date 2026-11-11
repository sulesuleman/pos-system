---
title: 'Story 1.3 (frontend half): Register a Mart and its Owner, with tenant isolation'
type: 'feature'
created: '2026-11-11'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2871ebf76b13d558779b7e66bd5bf10fc1b9684b'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/frontend/CLAUDE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Super Admin area is still the Story 1.2 placeholder (a health line and a sign-out button) — there is no way to see existing Marts or create a new one, which is the Super Admin's core job.

**Approach:** Replace the placeholder with a Marts list (name, code, status only) and a "Create Mart" dialog that collects Mart name plus the Owner's first name, last name, email, contact number and CNIC, then reveals the one-time setup code, Mart code and Owner Staff ID exactly once after creation.

**Decisions (2026-11-11):**
- Story 1.3 is split like Stories 1.1/1.2. This spec is the frontend half only. The backend half (Mart/Owner persistence, the EF Core global query filter and its CI isolation test, Staff ID/Mart code generation, setup-code issuance, platform audit log write) is tracked in `backend-1-3-checklist.md`, owned by the product owner, and will be implemented together with `backend-1-2-checklist.md` in a later session. Story 1.3 is `done` in sprint status only when both halves are.
- Creating a Mart happens in a dialog opened from the Marts list, not a separate route — the whole flow (form, validation, one-time reveal) is small enough to stay in one place and matches the existing session-check/skeleton patterns already in this codebase.
- Sign-out moves from `SuperAdminArea`'s body into `ManagerShell`'s `AppBar` (alongside the theme toggle), since `ManagerShell` is now exclusively the authenticated shell (post Story 1.2's routing fix) — this also removes `SuperAdminArea`'s one flagged cross-feature import of `signOut`, since the shell is not a feature.
- `SuperAdminArea.tsx` becomes the Marts screen's container (list + the "Create Mart" button); the health-check line is dropped now that the screen has real content (health is still checked in CI/manually, not displayed to the Super Admin).
- **Owner field set (confirmed 2026-11-11, renegotiated intent):** the single "Owner name"/"Owner contact" fields are replaced by five fields: **First name**, **Last name**, **Email**, **Contact** (phone number), **CNIC**.
  - Email: validated as a well-formed email address (not just non-empty).
  - Contact: a phone number, validated for basic shape (digits, optional leading `+` for a country code, roughly 7-15 digits) — not a strict carrier/region check.
  - CNIC: Pakistani CNIC, auto-formatted as the user types into the canonical `NNNNN-NNNNNNN-N` shape (13 digits, dashes after the 5th and 12th digit) and validated to match that exact pattern once complete.
  - First name / Last name: required, free text, no further format validation.
- **Endpoint contract (confirmed 2026-11-11, updated for the new Owner fields), locked in exactly as proposed:**
  - `GET /api/v1/marts` → `200` `[{ id, name, code, status }]` (unchanged).
  - `POST /api/v1/marts` `{ martName, ownerFirstName, ownerLastName, ownerEmail, ownerContact, ownerCnic }` → `201` `{ martId, martCode, ownerStaffId, setupCode }` on success; `400` `{ errors: { martName?, ownerFirstName?, ownerLastName?, ownerEmail?, ownerContact?, ownerCnic? } }` (per-field messages) when a field is missing or fails validation; a generic error on any other failure.

## Boundaries & Constraints

**Always:** Reuse `InputField` for every text field; follow `frontend/CLAUDE.md` in full (feature folder `manager/features/super-admin/`, no asterisk/the `(required)` label suffix, always-shrunk labels with placeholders, disabled+spinner submit buttons, skeletons instead of full-screen spinners, hover-only scrollbars, light/dark mode via the existing theme). API calls versioned under `/api/v1`, `credentials: 'include'`, a timeout (`AbortSignal.timeout(5000)`), never throwing to the caller (same pattern as `superAdminAuth.ts`). The one-time setup code (and Mart code, Staff ID) is shown in a dialog that cannot be dismissed without an explicit acknowledgement, and never re-shown after close. All six create-Mart fields validate client-side before any network call: required-ness for every field, plus format validation for Email, Contact and CNIC specifically (each field's own message, not a generic one). CNIC auto-formats as the user types (dashes inserted after the 5th and 12th digit; non-digit keystrokes ignored beyond stripping/re-inserting the dashes).

**Never:** No suspend/reactivate UI (Story 1.7). No Owner activation/login (Story 1.4). No Mart detail/edit screen beyond the list + create flow. No business data (sales, stock, staff) anywhere in the Super Admin area. Do not write, scaffold or modify any backend (.NET) file, project or CI step.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Marts list loads | authenticated Super Admin visits `/super-admin` | a skeleton shows while loading, then a table/list of existing Marts (name, code, status) | network/API error shows a generic inline message with a retry action, no crash |
| Marts list is empty | no Marts exist yet | an empty-state message inviting the Super Admin to create one | N/A |
| Open create dialog | click "Create Mart" | dialog opens with all six fields empty (Mart name, Owner first/last name, Email, Contact, CNIC) | N/A |
| Submit with a missing field | one or more of the six fields empty | saving is blocked, each empty field shows a "required" message, no request is sent | N/A |
| Invalid Email | a non-empty value with no `@`/domain shape | saving is blocked, Email shows its own format message, no request is sent | N/A |
| Invalid Contact | a non-empty value that isn't digits (+ optional leading `+`), too short/long | saving is blocked, Contact shows its own format message, no request is sent | N/A |
| Invalid/incomplete CNIC | fewer than 13 digits typed, or (defensively) a malformed value reaches submit | input auto-formats dashes as digits are typed; saving is blocked until exactly `NNNNN-NNNNNNN-N`, with its own format message, no request is sent | N/A |
| Submit with all fields valid | valid input in all six fields, save clicked | submit button disabled + spinner while in flight; on success the form is replaced by the one-time reveal (Mart code, Owner Staff ID, setup code) | network/API/server error shows a generic message inline in the dialog, fields remain filled, dialog stays open |
| Acknowledge the one-time reveal | reveal is shown, user closes it | dialog closes, Marts list refreshes to include the new Mart, the setup code is never retrievable again from this screen | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/manager/features/super-admin/SuperAdminArea.tsx` -- currently the Story 1.2 placeholder (health line + sign-out); becomes the Marts screen's container (fetches the list, renders it, hosts the "Create Mart" button and dialog). Health line and `signOut` import removed.
- `frontend/src/manager/ManagerShell.tsx` -- currently `AppBar` (title + `ThemeToggleButton`) + `Outlet`; gains a "Sign out" button next to the toggle, calling `signOut` from `shared/api/superAdminAuth` and navigating to `/super-admin/sign-in` (same "always clears local state regardless of API outcome" behavior `SuperAdminArea` already had).
- `frontend/src/shared/api/superAdminAuth.ts` -- pattern to follow (typed result, try/catch, timeout, `credentials: 'include'') for the new `marts.ts` API module; unchanged itself.
- `frontend/src/shared/common/Inputs/InputField/` -- reuse as-is for the three create-Mart fields.
- `frontend/src/shared/theme/` -- reuse `Skeleton`, `Paper`/`Dialog` overrides already ported; no theme changes needed.
- `_bmad-output/implementation-artifacts/backend-1-2-checklist.md` -- pattern to follow when writing `backend-1-3-checklist.md`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/shared/api/marts.ts` + `.test.ts` -- `listMarts()`, `createMart(input)`, each returning a typed result (never throwing), per the endpoint contract decided above.
- [x] `frontend/src/manager/features/super-admin/MartsList.tsx` + `.test.tsx` -- fetches and renders the Marts table/list (name, code, status), a skeleton while loading, an empty state, and a generic inline error with retry -- covers the list rows of the I/O matrix.
- [x] `frontend/src/manager/features/super-admin/CreateMartDialog.tsx` + `.test.tsx` -- the dialog: three `InputField`s, per-field validation messages on empty submit, disabled+spinner submit button while in flight, generic inline error on failure, and the one-time reveal step (Mart code, Owner Staff ID, setup code) with an explicit "Done" acknowledgement before closing -- covers the dialog rows of the I/O matrix.
- [x] `frontend/src/manager/features/super-admin/SuperAdminArea.tsx` + `.test.tsx` -- renders `MartsList` + a "Create Mart" button opening `CreateMartDialog`; refreshes the list when the dialog closes after a successful create; health line and `signOut` removed (moved to `ManagerShell`).
- [x] `frontend/src/manager/ManagerShell.tsx` + `.test.tsx` -- add the "Sign out" button next to the theme toggle, same clears-regardless-of-outcome behavior as before.

**Acceptance Criteria:**
- Given the Marts list is showing, when a Mart is created successfully and the reveal dialog is acknowledged, then the list includes the new Mart without a full page reload.
- Given any of the three create-Mart fields is left empty, when save is attempted, then no network request is sent and each empty field shows its own validation message.
- Given the one-time reveal has been acknowledged and closed, when the dialog is reopened for a new Mart, then no trace of the previous Mart's setup code is shown anywhere.

## Implementation Notes

- `MartsList` exposes a `refresh()` handle via `forwardRef`/`useImperativeHandle` so `SuperAdminArea` can reload the list after a successful create without a full page reload or prop-drilled refetch key.
- `CreateMartDialog` keeps all state (`form`, `fieldErrors`, `serverError`, `reveal`) local and fully resets it in both the Cancel and Done paths, so reopening for a new Mart never shows a trace of the previous one's codes.
- The reveal step cannot be dismissed: `Dialog`'s `onClose` callback is a no-op whenever `reveal !== null`, so neither a backdrop click nor Escape closes it — only the explicit "Done" button (which calls `onCreated`, not `onClose`).
- This installed `@mui/material` version (9.1.2) does not expose `disableEscapeKeyDown` on `DialogProps` (Modal no longer has that prop in this version); the same effect is achieved by guarding in `onClose` instead, verified by a test that presses Escape during the reveal and asserts neither callback fires.
- `ManagerShell`'s sign-out button reuses the exact "clear local state and navigate away regardless of API outcome" behavior the Story 1.2 placeholder had in `SuperAdminArea`, just relocated.
- Backend tracking: created `backend-1-3-checklist.md` (owner-implemented, no backend code written) mirroring `backend-1-2-checklist.md`'s format, covering Mart/Owner persistence, Mart code/Staff ID/setup-code generation, the EF Core global query filter, its CI two-Mart isolation test, and the platform audit log write.
- Known minor limitation (round 2, CNIC field): `formatCnic` re-derives the full display string from scratch on every keystroke; it does not preserve cursor position, so editing in the middle of an already-formatted CNIC (e.g. backspacing a digit before a dash) can jump the cursor to the end rather than staying in place. Cosmetic only — the resulting value is always correct — not fixed in this round since it would need a proper masked-input approach (tracking/restoring `selectionStart`) rather than a trivial change.

## Spec Change Log

- 2026-11-11 (human renegotiation, after Story 1.3 first shipped as `done`): the user directly changed the Owner data captured on Mart creation — single "Owner name"/"Owner contact" fields replaced by **First name, Last name, Email, Contact, CNIC**. Frozen `Intent`/`Boundaries & Constraints`/`I/O & Edge-Case Matrix` updated in place (human-initiated, so editable per the frozen block's own rule). Endpoint contract updated to match (`ownerName`/`ownerContact` → `ownerFirstName`/`ownerLastName`/`ownerEmail`/`ownerContact`/`ownerCnic`). KEEP: everything else from the first round — the dialog's one-time-reveal/cannot-dismiss/reset-on-reopen behavior, `MartsList`'s mount/race guards, the double-submit guard, the API response shape guards — all survive unchanged; only the field set and its validation grow.

## Reopened: Owner field set (2026-11-11, round 2)

**Additional Tasks:**
- [x] `frontend/src/shared/api/marts.ts` -- `CreateMartInput`/`CreateMartFieldErrors` updated to `{ martName, ownerFirstName, ownerLastName, ownerEmail, ownerContact, ownerCnic }`; `createMart` sends/receives the new field names; `isCreateMartSuccess` unchanged (reveal shape didn't change).
- [x] `frontend/src/manager/features/super-admin/CreateMartDialog.tsx` -- six `InputField`s (Mart name, First name, Last name, Email, Contact, CNIC); client-side validation per field (required for all; format checks for Email/Contact/CNIC) before any network call; CNIC input auto-formats dashes as the user types.
- [x] Update existing tests in `marts.test.ts` and `CreateMartDialog.test.tsx` for the new field names/shapes; add cases for each new format-validation message (invalid Email, invalid Contact, incomplete/invalid CNIC) and for the CNIC auto-format behavior itself (typing 13 digits produces the dashed display value).

**Acceptance (this round):**
- Given any of the six fields is empty, when save is attempted, then that field's own "required" message shows and no request is sent.
- Given Email/Contact/CNIC each has a non-empty but invalid value, when save is attempted, then that field's own format message shows (not a generic one) and no request is sent.
- Given a user types 13 digits into the CNIC field, when inspected, then the displayed value reads `NNNNN-NNNNNNN-N`.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|-------|---------|---------|----------|-------|
| 1 | blind | `CreateMartDialog.tsx` uses `React.ChangeEvent<HTMLInputElement>` without importing `React` | false | Refuted: `node_modules/@types/react/index.d.ts` declares `namespace React` ambiently (global, not module-scoped); confirmed by a clean `tsc -b` with zero errors | rejected |
| 2 | blind, edge-case (deletion) | `MartsList`'s `load()` has no mount-guard before `setLoading`/`setError`/`setMarts` after the async `listMarts()` resolves, unlike the `active`-flag pattern used elsewhere in this codebase (`health.ts`-driven effects, `RequireSession`, `SignInPage`) | low | Verified: no `active` flag or cleanup in `load`/`useEffect`; state-update-after-unmount is a real but React-dev-warning-only consequence, not a crash | patch |
| 3 | blind, verification-gap | The dialog's server-side `reason: 'validation'` branch (400 response) is never exercised by a test | high | Verified: `CreateMartDialog.test.tsx`'s only failure-path test mocks `reason: 'error'`, never `reason: 'validation'`; that branch could be deleted/miswired and no test would fail | patch |
| 4 | blind | `updateField` never clears a field's existing `fieldErrors` entry when the user edits that field — a corrected field still shows its stale "This field is required." message until the next submit | low | Verified: `updateField` only updates `form`, never touches `fieldErrors` | patch |
| 5 | blind, edge-case | `listMarts()` only checks `Array.isArray(body)`, never validates each item's shape (`id`/`name`/`code`/`status`) before returning `ok: true` | medium | Verified: a malformed/partially-shaped 200 body would render blank/`undefined` table cells instead of the generic inline error the I/O matrix promises for bad responses | patch |
| 6 | verification-gap | One-time reveal/form state is never tested to clear when the dialog is reopened for a new Mart (only unit-level `resetState()` exists; no test reopens after Done) | high | Verified: `CreateMartDialog` is always mounted (`open` prop only toggles visibility in `SuperAdminArea`), so a future regression dropping `resetState()` from `handleDone` would let a previous Mart's setup code resurface, and no existing test would catch it | patch |
| 7 | blind | No task, test, or field-error scenario anywhere covers a duplicate Mart name (only `Code` has a uniqueness constraint mentioned) | medium | Real gap, but the frontend's `createMart` 400 handling is already generic (renders whatever field-keyed message the backend sends, not hardcoded to "required"), so no frontend change is needed — only the backend needs to return `errors: { martName: "..." }` for a duplicate name | defer (tracked in `backend-1-3-checklist.md`) |
| 8 | blind | No companion test confirming Escape/backdrop dismissal still works normally during the form-entry step (only tested that it's blocked during the reveal) | low | Real verification-completeness gap, not a current bug; cheap to add alongside the other new tests | patch |
| 9 | edge-case | A 400 response with an empty/missing `errors` object is treated as "validation" but clears all field errors and sets no generic message either — the user sees the spinner stop with zero feedback | medium | Verified: `setFieldErrors(result.errors)` with `result.errors === {}` leaves every field clean and `serverError` untouched | patch |
| 10 | edge-case | `MartsList.load()`/`refresh()` has no race guard — an older in-flight `listMarts()` response can resolve after a newer one and overwrite the list with stale data | medium | Real: no request-generation token; plausible via rapid Retry clicks or a refresh triggered while the initial load is still in flight | patch |
| 11 | edge-case | No re-entrancy guard in `CreateMartDialog.handleSubmit` — a double-click/double-Enter before the disabled state re-renders can send two `POST /api/v1/marts` requests | medium | Real: unlike Story 1.2's sign-in (benign duplicate attempt), this could create two Marts for one submission; fix is a trivial guard | patch |
| 12 | verification-gap (other) | `Dialog`'s `onClose` guard only blocks dismissal while `reveal !== null`; it does not block Escape/backdrop while `submitting` is true but `reveal` is still null, even though Save/Cancel are both disabled during that window | medium | Verified: a user can bypass the disabled Cancel button via Escape/backdrop mid-request; the stale response can later resolve into an already-"cancelled" but still-mounted dialog, bleeding into the next open | patch |

**Patch batch sent to the implementation subagent, items 2-6, 8-12 (item 1 rejected, item 7 deferred to `backend-1-3-checklist.md`).**

## Verification

**Commands:**
- `cd frontend && npm run lint && npm run typecheck && npm test && npm run build` -- ran 2026-11-11, all four exited 0 (56 tests passed across 11 files; lint, typecheck and `vite build` clean).
- Re-verified 2026-11-11 after review patches (triage rows 2-6, 8-12): lint clean, typecheck clean, 59/59 tests across 11 files, build unchanged. Spot-checked the race-guard (`requestIdRef`), mount-guard (`activeRef`), and both API shape guards (`isMart`/`isCreateMartSuccess`) directly against source — all correct as reported.
- Re-verified 2026-11-11 after round 2 (Owner field set change to six fields): lint clean, typecheck clean, 63/63 tests across 11 files (4 new cases: invalid Email, invalid Contact, incomplete CNIC, CNIC auto-format), build unchanged (manager bundle grew ~2KB for the three new fields/validators). All round-1 behaviors (one-time reveal, cannot-dismiss, reset-on-reopen, mount/race guards, double-submit guard, API shape guards) re-ran unchanged and still pass.

**Manual checks (if no CLI):**
- Not applicable beyond the above — no real backend exists yet, so list/create calls hit a network error in a live `npm run dev` session; the generic-error and retry paths already cover that (confirmed by the mocked network-failure tests in `marts.test.ts`, `MartsList.test.tsx` and `CreateMartDialog.test.tsx`).
