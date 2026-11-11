---
title: 'Story 1.2 (frontend half): Super Admin sign-in'
type: 'feature'
created: '2026-11-11'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0a5e96f8ab6dfd892d91a35ecb2743ddd64365d0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way for a seeded Super Admin to sign in; the Manager/Owner entry point only shows a health check. Nothing reaches a Super Admin area, and no session persists across a reload.

**Approach:** Add client-side routing to the Manager/Owner entry point, a Super Admin sign-in screen that calls the sign-in API, a minimal placeholder Super Admin area reachable only when signed in, and a sign-out action. Session state persists across reloads (not just in memory).

**Decisions (2026-11-11):**
- Story 1.2 is split like Story 1.1. This spec is the frontend half only. The backend half (seed script for the Super Admin account, sign-in/sign-out/session endpoints, password check, platform audit log write) is implemented by the product owner and tracked in `backend-1-2-checklist.md`. Story 1.2 is `done` in sprint status only when both halves are.
- The Super Admin area lives inside the existing Manager/Owner entry point (not a new HTML entry point) — the architecture's "Counter vs Manager/Owner" split is about platform (Electron-able vs not), and Super Admin is not Counter.
- Root `/` of the Manager/Owner entry redirects to `/super-admin/sign-in` for now — Owner login (Story 1.4) will replace this redirect with a real chooser/landing; this is a temporary, reversible routing default, not a product decision.
- Super Admin and Owner/staff keep **separate sign-in screens** (confirmed 2026-11-11) — their credential shapes differ (email+password vs Mart code+Staff ID+password) and the docs already describe them as distinct areas. Owner/staff sign-in is a later story (1.4); this spec only ever renders `/super-admin/sign-in`.
- **Session transport: httpOnly session cookie** (confirmed 2026-11-11). The backend sets the cookie on sign-in; the frontend never reads or stores the token. `apiFetch` must send `credentials: 'include'` on the auth calls (and the session check) so the cookie round-trips; the dev proxy and any CORS config are the backend half's concern. This mechanism will be reused by Owner/staff login later.
- **Endpoint contract (confirmed 2026-11-11), locked in exactly as proposed:**
  - `POST /api/v1/super-admin/sign-in` `{ email, password }` → `200` + sets the session cookie on success; `401` with a generic message on bad credentials.
  - `POST /api/v1/super-admin/sign-out` → `204`, clears the session cookie.
  - `GET /api/v1/super-admin/session` → `200` if the session cookie is valid, `401` if not — used on app load to restore a persisted session without re-prompting.

## Boundaries & Constraints

**Always:** New dependency `react-router-dom` pinned exact (no `^`) at a version whose peers accept React 19, used via the classic JSX route API (`<BrowserRouter>`/`<Routes>`/`<Route>`), not the data router (`createBrowserRouter`) — matches this codebase's current simplicity; Story 1.4 can revisit if routing grows data loaders. Routes: `/super-admin/sign-in` (public) and `/super-admin` (placeholder, requires a session). Sign-in calls are versioned under `/api/v1`. Wrong credentials show one generic message (never reveal whether the email exists). No secrets or credentials committed.

**Never:** No in-app way to create a Super Admin account (seed-only, backend half). No Marts list, create/suspend/reactivate UI (Story 1.3/1.7). No Owner or staff login (Story 1.4). No Counter changes. Do not write, scaffold or modify any backend (.NET) file, project or CI step.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sign in, correct credentials | valid email + password on `/super-admin/sign-in` | redirected to `/super-admin`; session persists across reload | N/A |
| Sign in, wrong credentials | invalid email or password | generic "Incorrect email or password." shown; stays on sign-in; no session created | caught, no crash |
| Sign in, network/API error | request throws or non-2xx/non-401 status | generic "Something went wrong. Try again." shown; no session created | caught, no crash |
| Visit `/super-admin` with no session | no session, or session invalid/expired | redirected to `/super-admin/sign-in`; a loading placeholder (not the protected content) shows while `getSession()` is pending | N/A |
| Sign out | authenticated, clicks "Sign out" | server session cleared; local auth UI state (e.g. the in-memory authenticated flag) cleared; redirected to `/super-admin/sign-in` | sign-out call failing still clears local auth UI state and redirects — never leaves the UI stuck showing "signed in" |
| Reload while signed in | valid persisted session | still on `/super-admin`, no re-prompt | N/A |
| Reload at `/super-admin/sign-in` while already authenticated | valid persisted session, user is on the sign-in route | redirected to `/super-admin` | N/A |
| Visit `/super-admin/sign-in` directly while already authenticated | valid session, direct navigation to the sign-in route | redirected to `/super-admin` (no re-prompt) | N/A |

</frozen-after-approval>

## Code Map

- `frontend/package.json` -- add `react-router-dom` (exact version, React 19-compatible peers).
- `frontend/src/manager/main.tsx` -- currently renders `<ManagerShell />` directly; wrap in a router and route table instead.
- `frontend/src/manager/ManagerShell.tsx` -- existing health-check shell; stays as the root layout (AppBar + `<Outlet/>`), rendering whichever route is active; move the health-check line into `SuperAdminArea.tsx` so that coverage isn't lost.
- `frontend/src/shared/api/client.ts` -- `apiFetch`/`apiUrl` helpers; the new auth calls pass `credentials: 'include'` per-call (don't change the shared default — `getHealth` doesn't need cookies).
- `frontend/src/shared/api/health.ts` -- pattern to follow for a new `superAdminAuth.ts` module (typed result, try/catch, no throw to callers).
- `_bmad-output/implementation-artifacts/backend-1-1-checklist.md` -- pattern to follow when writing `backend-1-2-checklist.md`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/package.json` -- add `react-router-dom` pinned exact -- routing dependency.
- [x] `frontend/src/shared/api/superAdminAuth.ts` -- `signIn(email, password)`, `signOut()`, `getSession()`, each returning a typed result and never throwing to the caller (same pattern as `getHealth`) -- API calls per the endpoint contract decided above.
- [x] `frontend/src/manager/superAdmin/SignInPage.tsx` -- email + password form (MUI), calls `signIn`, shows the one generic error message on failure, navigates to `/super-admin` on success; also calls `getSession()` on mount and redirects to `/super-admin` immediately if already valid, instead of rendering the form -- the sign-in screen, covers the "already authenticated" rows too.
- [x] `frontend/src/manager/superAdmin/SuperAdminArea.tsx` -- placeholder page (e.g. "Super Admin" heading, the existing health line, a "Sign out" button calling `signOut` then navigating to `/super-admin/sign-in`) -- minimal landing until Story 1.3 adds the Marts list.
- [x] `frontend/src/manager/superAdmin/RequireSession.tsx` -- route guard: calls `getSession()` once on mount; while pending, renders a loading placeholder (not children, not a redirect); once settled, renders children when valid or redirects to `/super-admin/sign-in` when not -- protects `/super-admin`, never flashes protected content.
- [x] `frontend/src/manager/main.tsx` -- set up `react-router-dom` (classic JSX route API) with routes `/` (redirect to `/super-admin/sign-in`), `/super-admin/sign-in`, `/super-admin` (wrapped in `RequireSession`), `ManagerShell` as the layout route rendering `<Outlet/>` -- wiring.
- [x] `frontend/src/manager/ManagerShell.test.tsx` -- update for its new layout-only role (no longer asserts the health line directly); the health-check assertion moves to `SuperAdminArea.test.tsx` -- keeps Story 1.1's test coverage intact instead of going stale.
- [x] `frontend/src/manager/superAdmin/*.test.tsx` -- cover every I/O matrix row (mock the API module, not `fetch`) -- regression guard.

**Acceptance Criteria:**
- Given no session, when `/super-admin` is visited directly, then the app redirects to `/super-admin/sign-in` without flashing protected content.
- Given a signed-in session, when the page is reloaded, then the user stays on `/super-admin` with no new sign-in prompt.
- Given sign-in fails for any reason (bad credentials, network error, server error), when the error is shown, then no internal detail (status code, stack, "user not found") ever reaches the UI.

## Reopened: theme + shared component conventions (2026-11-11)

New standing conventions arrived after the review patches landed (recorded in `frontend/CLAUDE.md` and memory `pos-frontend-conventions`), applying to this screen now and to all future frontend work:
- Reusable components live at `frontend/src/shared/common/<Category>/<ComponentName>/index.tsx` + a sibling `use<ComponentName>Styles.tsx` returning the style/`sx` objects — never inline styles in a reusable component, never couple it to one screen/feature.
- Theme and MUI overrides are adapted (not copied verbatim) from `C:\Users\MuhammadSuleman\Desktop\OfficeWork\vdk-tenent-projects\VDK-AccessAndControl\AccessAndControl.Frontend\src\ui\theme` — the **complete** theme folder (all `overrides/components/*.tsx`, not just the ones this app currently renders — confirmed 2026-11-11), so later screens/components can adopt the rest without a second port. If an override needs an MUI package this app doesn't have installed yet (e.g. date-picker, data-grid), add that dependency pinned exact, unless it's a large dependency with no other current use — in that case port the override's logic as-is and note it only takes effect once that component is added.
- Light/dark mode: default to `prefers-color-scheme`, manual toggle overrides it, explicit choice persists (e.g. `localStorage`), reachable from both the sign-in screen and the authenticated layout.
- The sign-in screen should look considered/"catchy", not bare MUI defaults.

**Additional Tasks (this round):**
- [x] `frontend/src/shared/theme/` (new directory, replaces `frontend/src/shared/theme.ts`) -- `palette.ts`, `typography.ts`, `shadows.ts`, `customShadows.ts`, `breakpoints.ts` adapted from the reference repo's equivalents; `overrides/components/*.tsx` + `overrides/index.ts` ported in full (all ~29 override files, not just currently-used components); `theme-mode.ts` (mode context + localStorage persistence, OS-preference default via `prefers-color-scheme`, not the reference repo's light-only default); `index.tsx` exporting an `AppThemeProvider` (palette/shadows per mode, typography, breakpoints, `componentsOverrides`, wraps children in `ThemeModeContext.Provider` + MUI `ThemeProvider` + `CssBaseline`) -- the theme foundation both entry points use, ready for later screens to draw on without a second port.
- [x] `frontend/src/manager/main.tsx`, `frontend/src/counter/main.tsx` -- replace the static `theme` import + manual `ThemeProvider`/`CssBaseline` with `AppThemeProvider` -- wires light/dark mode app-wide.
- [x] `frontend/src/shared/common/Inputs/InputField/index.tsx` + `useInputFieldStyles.tsx` -- a themed, decoupled text-input wrapper around MUI `TextField` (props in, no page-specific logic) -- first shared component, used by `SignInPage`'s email/password fields.
- [x] A theme-mode toggle control (e.g. `frontend/src/shared/common/Buttons/ThemeToggleButton/index.tsx` + its styles file, following the same convention) -- reachable from `SignInPage` and from `ManagerShell`'s `AppBar`.
- [x] `frontend/src/manager/superAdmin/SignInPage.tsx` -- redesign using the new theme and `InputField`/toggle components for a considered, on-brand look (not a bare centered form) -- still satisfies every I/O matrix row and existing tests' behavioral intent (update test selectors/text only as needed if the markup changes, never the asserted behavior).
- [x] `frontend/src/manager/ManagerShell.tsx` -- add the theme-mode toggle to the `AppBar` -- reachable once signed in too.

**Acceptance (this round):**
- Given a fresh browser with no stored preference, when either entry point loads, then the theme matches the OS's `prefers-color-scheme`.
- Given the manual toggle is used, when the page is reloaded, then the chosen mode persists.
- Given the sign-in screen, when compared to the previous plain MUI form, then it visibly uses the ported theme and a considered layout, not MUI defaults.
- Given `InputField`, when inspected, then it contains no reference to Super Admin, sign-in, or any other feature-specific concept.

## Reopened: form-field, busy-state, and scrollbar conventions (2026-11-11, round 2)

More standing conventions arrived after the theme port + redesign landed (recorded in `frontend/CLAUDE.md` and memory `pos-frontend-conventions`), applying to this screen now and to all future frontend work:
- No asterisk (`*`) for a required field — use the literal word `(required)` in the label instead.
- A field's label is always shown shrunk/floating, with the placeholder visible inside the field at the same time (never the label-as-placeholder resting state).
- A submit button stays disabled for the whole action and shows a loading spinner while submitting — never silent/no-feedback disabling.
- Never a single global/full-screen spinner for a loading state — use skeleton placeholders shaped like the content about to appear.
- Scrollable containers keep their scrollbar's layout space reserved (no reflow) but hide it visually until the user hovers that container.

**Additional Tasks (this round):**
- [x] `frontend/src/shared/common/Inputs/InputField/index.tsx` -- when `required` is set, derive the rendered label as `${label} (required)` instead of relying on MUI's default asterisk (disable MUI's own indicator, e.g. pass the computed label and no native `required` styling hook); always pass `InputLabelProps`/`slotProps.inputLabel` `shrink: true` and keep a `placeholder` prop passed through so it shows under the shrunk label -- shared behavior for every current and future field.
- [x] `frontend/src/manager/superAdmin/SignInPage.tsx` -- pass an actual `placeholder` to both `InputField`s (e.g. "you@example.com", "••••••••"); submit `Button` shows a small spinner (e.g. MUI `CircularProgress`) alongside/instead of its label while `submitting` is true, staying disabled for the whole duration (already disabled -- add the visual spinner).
- [x] `frontend/src/manager/superAdmin/SignInPage.tsx`, `frontend/src/manager/superAdmin/RequireSession.tsx` -- replace the full-screen "Loading…" `Typography` placeholder in both with a skeleton shaped like the content about to appear (`SignInPage`: skeleton the card -- title, two fields, button; `RequireSession`: skeleton shaped like a generic content block, since it wraps arbitrary children) using MUI `Skeleton` -- no single global spinner.
- [x] `frontend/src/shared/theme/` (wherever global CSS is set, e.g. the `css-baseline` override or a new global stylesheet) -- scrollbar rule: reserve layout space (`scrollbar-gutter: stable` or equivalent) but keep the scrollbar thumb/track hidden until the container is hovered, then show it; hide again on mouse-leave -- applies app-wide, not just this screen.

**Acceptance (this round):**
- Given a required field, when its label is inspected, then it reads `"<Label> (required)"` and no asterisk is rendered.
- Given any `InputField`, when it has a value or not, then its label is always in the shrunk position and its placeholder is visible whenever the field is empty.
- Given a sign-in submit, when the request is in flight, then the button is disabled and shows a spinner; given it settles (success or error), then the spinner disappears and the button's disabled state matches the resulting screen (navigated away, or re-enabled on error).
- Given `SignInPage`'s session check or `RequireSession`'s session check is pending, when the screen is inspected, then a skeleton shaped like the eventual content is shown, never a single centered "Loading…" spinner.
- Given a scrollable container with no pointer over it, when inspected, then its scrollbar is not visually shown but its layout width is unchanged from when the scrollbar is visible on hover (no content shift).

## Reopened: feature-based architecture restructure (2026-11-11, round 3)

Another standing convention arrived (recorded in `frontend/CLAUDE.md`'s new "Architecture: feature-based" section and in memory `pos-frontend-conventions`): each entry point organizes its screens under `src/<entry-point>/features/<feature-name>/`, colocating that feature's component(s), styles hook, API calls, and tests. Entry-point shell/layout stays at the entry point's root. Only genuinely cross-feature code stays in `src/shared/`.

This is a pure restructure (move + import-path fixes), not a behavior change -- no routing, auth logic, visual design, or test assertions should change, only file locations and import paths.

**Target layout (from the current flat layout):**
- `frontend/src/manager/features/auth/` -- `SignInPage.tsx` + `SignInPage.test.tsx` + `RequireSession.tsx` + `RequireSession.test.tsx` (moved from `manager/superAdmin/`) + `superAdminAuth.ts` + `superAdminAuth.test.ts` (moved from `shared/api/`, since sign-in/sign-out/session calls are this feature's own concern, not cross-feature).
- `frontend/src/manager/features/super-admin/` -- `SuperAdminArea.tsx` + `SuperAdminArea.test.tsx` (moved from `manager/superAdmin/`).
- `frontend/src/manager/` keeps `main.tsx`, `ManagerShell.tsx`, `ManagerShell.test.tsx` at its root (the shell, not a feature).
- `frontend/src/shared/api/` keeps only `client.ts`/`client.test.ts` and `health.ts`/`health.test.ts` (genuinely cross-feature: the base HTTP helper and the health check used by both `SuperAdminArea` and (originally) `ManagerShell`).
- `frontend/src/shared/common/` and `frontend/src/shared/theme/` are untouched.

**Additional Tasks (this round):**
- [x] Move the files above to their new paths (prefer `git mv` so history is preserved) and fix every import path affected by the new depth (feature folders are one level deeper than the old flat `manager/superAdmin/`) -- in the moved files themselves and in anything importing them (`main.tsx`, cross-references between `SignInPage`/`RequireSession`/`superAdminAuth`/`SuperAdminArea`).
- [x] Delete the now-empty `frontend/src/manager/superAdmin/` directory.

**Acceptance (this round):**
- Given the new layout, when `git status`/`find` is inspected, then no file remains under the old `manager/superAdmin/` path and every moved file's test still imports its subject from the new relative path.
- Given the full verification suite, when it runs after the move, then lint/typecheck/test/build all still pass with the same test count (35) and no behavior change.

## Implementation Notes

- 2026-11-11 implementation: `react-router-dom` pinned at `7.18.5` (peers `react >=18`, `react-dom >=18`; accepts React 19.3.0), classic JSX route API (`BrowserRouter`/`Routes`/`Route`), not the data router, per the spec's constraint. `ManagerShell` is now layout-only (`AppBar` + `Outlet`); the health-check line moved to `SuperAdminArea`. `superAdminAuth.ts` follows `health.ts`'s pattern exactly: typed result objects, `try/catch`, never throws; `signIn`/`signOut`/`getSession` all pass `credentials: 'include'` per-call without touching `apiFetch`'s shared default. `RequireSession` renders a `role="status"` "Loading…" placeholder while `getSession()` is pending, then either children or a `Navigate` once settled -- it never renders both, so protected content cannot flash. `SignInPage` also calls `getSession()` on mount (same pending-placeholder treatment) so a direct or reload visit to `/super-admin/sign-in` while already authenticated redirects to `/super-admin` without ever showing the form. Sign-out in `SuperAdminArea` always clears local state and navigates to `/super-admin/sign-in`, regardless of whether the `signOut()` call itself reports ok -- matches the "never leaves the UI stuck showing signed in" edge case.
- One test-writing gotcha worth recording: MUI's `required` `TextField` renders the label as `"Email *"` in the DOM (with a trailing asterisk span), so exact-string `getByLabelText('Email')` fails; tests use `getByLabelText(/Email/)` / `/Password/` instead.
- Also created `backend-1-2-checklist.md` (tracking only, no backend code written) listing the sign-in/sign-out/session endpoints, cookie session mechanism, seed script and platform audit log write the product owner still needs to implement, per this spec's Code Map note and the "backend is user-implemented" project convention. Story 1.2 stays `in-progress` in sprint status until that half is also done.
- 2026-11-11 feature-based architecture round: moved `SignInPage.tsx`/`.test.tsx` and `RequireSession.tsx`/`.test.tsx` from `manager/superAdmin/` to `manager/features/auth/` via `git mv`; moved `superAdminAuth.ts`/`.test.ts` from `shared/api/` to the same `manager/features/auth/` folder (sign-in/sign-out/session is this feature's own concern); moved `SuperAdminArea.tsx`/`.test.tsx` to `manager/features/super-admin/`. `manager/main.tsx`, `ManagerShell.tsx`/`.test.tsx` stay at the entry point's root. `shared/api/` now holds only `client.ts`/`.test.ts` and `health.ts`/`.test.ts`. Import paths fixed everywhere the new depth or new location broke them: `SignInPage`/`RequireSession` now import `superAdminAuth` from the same folder (`./superAdminAuth`) instead of `shared/api`; `superAdminAuth.ts` now reaches `shared/api/client` via `../../../shared/api/client`; `SignInPage` reaches `shared/common/*` via `../../../shared/common/...`; `SuperAdminArea` reaches `shared/api/health` via `../../../shared/api/health`; `main.tsx` imports all three from `./features/auth/*` / `./features/super-admin/*`. One necessary cross-feature import: `SuperAdminArea.tsx`/`.test.tsx` import `signOut`/the `superAdminAuth` module from `../auth/superAdminAuth`, since the Super Admin area's own sign-out button depends on the auth feature's API call -- flagged in-file as the one deliberate exception to "a feature never reaches into another feature's folder" (sign-out has no other home without duplicating or re-abstracting it, which would be a behavior-risking change this restructure round explicitly avoids). Pure move + import-path fix: no routing, auth logic, or test assertions changed.
- 2026-11-11 form-field/busy-state/scrollbar round: `InputField` now computes its own displayed label (`"${label} (required)"` when `required` is set, suppressing MUI's native asterisk by passing `required={false}` to the underlying `TextField` while still forwarding `required`/`aria-required` onto the real input via `slotProps.htmlInput`) and always forces `slotProps.inputLabel.shrink = true`, so a passed-through `placeholder` is visible under the floating label at all times. `SignInPage` passes `placeholder="you@example.com"` / `"••••••••"` to its two fields; its submit `Button` keeps a stable accessible name (`aria-label="Sign in"`) and swaps its visible content for an MUI `CircularProgress` while `submitting` is true. Both `SignInPage`'s session-check placeholder and `RequireSession`'s pending placeholder were replaced: `SignInPage` now shows a `Skeleton`-shaped mock of the sign-in card (title, two fields, button); `RequireSession` shows a generic `Skeleton` block (title + body + action shape), since it wraps arbitrary children and has no fixed content to mirror -- neither is a single global/full-screen spinner any more. `RequireSession.test.tsx`'s pending-state assertion was updated from an exact `"Loading…"` text match to presence-only (`getByRole('status')` in the document), since the text no longer exists -- the behavioral assertion it guards (children never render while pending) is unchanged. Added an app-wide scrollbar rule to the `css-baseline` theme override: `scrollbar-gutter: stable` (plus Firefox's `scrollbarWidth: 'thin'`) reserves every scrollable container's scrollbar space permanently, while `scrollbarColor` (Firefox) and `::-webkit-scrollbar-thumb` (Chromium/WebKit) paint the thumb transparent at rest and the real colour only on `:hover`/`:focus-within`, so the bar is invisible until the pointer is over that specific container and never causes reflow when it appears.
- 2026-11-11 theme + shared-component round: ported the complete reference theme folder (`palette.ts`, `typography.ts`, `shadows.ts`, `customShadows.ts`, `breakpoints.ts`, `theme-mode.ts`, `css.ts`, `index.tsx`, and all ~29 `overrides/components/*.tsx` files + `overrides/index.ts`) into `frontend/src/shared/theme/`, adapted (not copied verbatim): other-product brand references and font (`SuisseIntl`) stripped, font swapped for `Inter`/system-sans, `theme-mode.ts`'s default inverted from light-only to `prefers-color-scheme` with an explicit-choice override persisted in `localStorage`, and the reference's `lodash.merge` replaced with a small local recursive `mergeComponents` (not a project dependency) since several override files edit the same MUI component key (e.g. both `dialog.tsx` and `date-picker.tsx` touch `MuiDialogActions`) and need a deep, not shallow, merge. Two files reference packages this app does not install: `textField.tsx`'s `MuiPickersFilledInput` mirror (from `@mui/x-date-pickers/PickersTextField`) was dropped rather than ported, since there is no safe way to reproduce its class-name constants without that package; `date-picker.tsx` was ported with its plain style overrides but without the reference's custom icon-slot defaults, which depended on `@fluentui/react-icons` (an unrelated, heavy, brand-specific icon package with no other use in this app) -- both `@mui/x-date-pickers` and `@mui/x-data-grid` remain uninstalled, so `date-picker.tsx` and `data-grid.tsx` take effect only once/if this app adds those components/packages. Added `frontend/src/shared/common/Inputs/InputField` and `frontend/src/shared/common/Buttons/ThemeToggleButton` (each `index.tsx` + sibling `use<Name>Styles.tsx`, no feature-specific logic). Redesigned `SignInPage.tsx` as a two-pane layout (a `theme.palette.gradients.field` hero panel + a `Paper` card with `theme.customShadows.z16`, `InputField` fields and a `ThemeToggleButton`) rather than a centered bare form; all I/O-matrix behavior and existing test assertions were preserved unchanged. Added the theme-mode toggle to `ManagerShell`'s `AppBar`. Deleted `frontend/src/shared/theme.ts`; updated `main.tsx` (both entry points) to `AppThemeProvider`, and updated the tests/setup that referenced the old theme file (`ManagerShell.test.tsx`, `CounterShell.test.tsx`, `SignInPage.test.tsx`) plus `src/test/setup.ts` (stubs `window.matchMedia`, which jsdom does not implement and the theme's OS-preference check now calls).

- 2026-11-11 (orchestrator fix-up): resolved the round-3 flagged cross-feature import. `superAdminAuth.ts`/`.test.ts` moved again -- from `manager/features/auth/` to `shared/api/` -- since it's genuinely used by two features (`auth`'s `SignInPage`/`RequireSession` and `super-admin`'s `SuperAdminArea`'s sign-out), which is exactly the "shared" criterion in `frontend/CLAUDE.md`'s architecture section, not an exception to it. Import paths fixed accordingly: `superAdminAuth.ts` now reaches `client.ts` via `./client` (same folder); `SignInPage.tsx`/`RequireSession.tsx`/their tests and `SuperAdminArea.tsx`/its test all reach it via `../../../shared/api/superAdminAuth`. Re-verified: lint clean, typecheck clean, 35/35 tests, build unchanged.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|-------|---------|---------|----------|-------|
| 1 | blind, verification-gap, edge-case (deletion+claim) | `SuperAdminArea.test.tsx` carries over only the `'ok'` health state; the `'checking…'` (pending) and `'unavailable'` states `ManagerShell.test.tsx` used to cover were dropped, contradicting the spec's own "keeps Story 1.1's test coverage intact" claim | high | Verified: read `SuperAdminArea.test.tsx` end to end — one health test, asserts only `'ok'`. Read deleted `ManagerShell.test.tsx` cases (checking/unavailable) confirmed gone with no replacement | patch |
| 2 | edge-case, verification-gap (other) | `superAdminAuth.ts`'s `signIn`/`signOut`/`getSession` fetch calls carry no timeout/`AbortSignal`, unlike `health.ts`'s `AbortSignal.timeout(5000)`; a hung backend leaves sign-in/sign-out/session-check pending forever | medium | Verified: read `superAdminAuth.ts` — no `signal` option on any of the three calls. A hung call never resolves/rejects, so `catch` never runs, leaving `RequireSession`'s "Loading…" and `SuperAdminArea`'s "Sign out" disabled state stuck — contradicts the spec's explicit "never leaves the UI stuck showing signed in" edge case | patch |
| 3 | edge-case | `main.tsx`'s route table has no catch-all route; any unmatched path renders the `AppBar` with a blank body and no feedback or redirect | low | Verified: read the `<Routes>` block — only `/`, `/super-admin/sign-in`, `/super-admin` registered, no `path="*"` | patch |
| 4 | blind | `SignInPage.tsx` does not clear the password field after a failed sign-in attempt (`setError` called, `setPassword` never reset) | low | Verified: read `handleSubmit` — only `setSubmitting`/`setError` run on failure; `password` state survives | patch |
| 5 | blind | `SignInPage.tsx`'s email field has no `autoFocus`; a user landing on `/super-admin/sign-in` must click in before typing | low | Verified: read the `TextField` props — no `autoFocus` | patch |
| 6 | blind | Session transport is specified as an httpOnly cookie with no CSRF mitigation discussed (no CSRF token, no `SameSite` value chosen) | medium | Real gap, but it is a backend design decision, not a frontend code defect in this diff — `credentials: 'include'` on the frontend is correct regardless of the backend's CSRF approach | defer (tracked in `backend-1-2-checklist.md`) |
| 7 | blind | No task schedules re-running the full I/O matrix (especially cookie round-tripping through the dev proxy) once the backend half's endpoints land | low | Real process gap, not a code defect; both halves' own docs already note the live check is deferred until the backend exists | defer (tracked in `backend-1-2-checklist.md`) |
| 8 | blind | `epic-1-context.md`'s MySQL→SQL Server content reads as an unflagged reversal bundled into this diff | false | Refuted: SQL Server (AD-14) was already decided 2026-10-10/11-10 in the architecture spine, before this story; `epic-1-context.md` was regenerated in this same working tree by an earlier, separate step (compiling stale epic context) preceding implementation, not introduced by the implementation subagent's change | rejected |
| 9 | edge-case | `SignInPage.tsx`'s `handleSubmit` has no unmount guard before `setSubmitting`/`setError`/`navigate` | low | Real only as a React dev-mode console warning if the user navigates away mid-submit; no functional break. Fix (an `active` flag) is more than a direct correction, and the scenario is unlikely in everyday use | rejected |
| 10 | edge-case | `noValidate` on the sign-in form disables native required-field validation, so an empty submit reaches `signIn()` | low | Real but low-harm (wasted call, same generic error shown); fix adds a branch, scenario uncommon enough not to justify it here | rejected |
| 11 | edge-case | `handleSubmit` has no re-entrancy guard against a rapid double Enter/click before re-render | low | Largely mitigated already by `disabled={submitting}`; residual race is unlikely and the guard fix is non-trivial relative to the benefit | rejected |
| 12 | blind | `SignInPage`/`RequireSession` duplicate the same mount→`getSession()`→loading-placeholder→branch logic rather than sharing a hook | low | Real duplication, named harm (Story 1.4 likely forks it again), but extracting a hook adds public surface — not a trivial fix, and no user-facing harm today | rejected |
| 13 | blind | No handling for multi-tab/multi-window session consistency (signing out in one tab leaves another showing `SuperAdminArea` until its own next `getSession()`) | low | Real edge case; fix (cross-tab messaging) is well beyond this story's scope and unlikely to matter for a single Super Admin operator | rejected |
| 14 | blind | `/` always redirects to `/super-admin/sign-in` even when already authenticated, causing an extra redirect hop via `SignInPage`'s own session check | low | Matches the frozen Intent's own documented decision ("temporary, reversible routing default... Story 1.4 will replace this redirect"); not a defect, working as specified | rejected |
| 15 | verification-gap | `main.tsx`'s real route table is never rendered by any test; each component test hand-writes its own matching path strings instead | low | Real gap, but matches this codebase's pre-existing convention (the Counter entry's `main.tsx` is likewise untested); closing it means introducing a new integration-test pattern beyond this story's scope | rejected |

## Verification

**Commands:**
- `cd frontend && npm ci && npm run lint && npm run typecheck && npm test && npm run build` -- all exit 0 (verified 2026-11-11: lint clean, typecheck clean, 33/33 tests passing across 8 files, build emits `dist/index.html` and `dist/counter.html`).
- Re-verified 2026-11-11 after review patches (triage rows 1-5): lint clean, typecheck clean, 35/35 tests across 8 files, build unchanged.
- Re-verified 2026-11-11 after the theme + shared-component round: lint clean, typecheck clean, 35/35 tests across 8 files (unchanged count -- markup/styling only, no test behavior changed), build emits `dist/index.html` and `dist/counter.html` plus a new shared `theme` chunk.
- Re-verified 2026-11-11 after the form-field/busy-state/scrollbar round: lint clean, typecheck clean, 35/35 tests across 8 files (one assertion in `RequireSession.test.tsx` updated from exact loading text to presence-only, per the skeleton swap -- same behavior covered), build unchanged in shape (`dist/index.html`, `dist/counter.html`, `manager`/`theme`/`counter` chunks).
- Re-verified 2026-11-11 after the feature-based architecture restructure: lint clean, typecheck clean, 35/35 tests across 8 files (no assertions changed, only import paths), build unchanged in shape. Confirmed no file remains under the old `manager/superAdmin/` path (directory removed) and no stray reference to the old `shared/api/superAdminAuth` or `manager/superAdmin/*` paths remains anywhere in `frontend/src` (grepped).

**Manual checks (if no CLI):**
- Not run; the CLI verification above covers the matrix (no backend endpoints exist yet to exercise live, so sign-in/session calls in tests and in a real `npm run dev` session both hit a network error, which the generic-error and redirect-to-sign-in paths already handle).
