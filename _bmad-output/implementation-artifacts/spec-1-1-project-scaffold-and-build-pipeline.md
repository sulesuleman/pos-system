---
title: 'Story 1.1 (frontend half): Project scaffold and build pipeline'
type: 'chore'
created: '2026-10-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The project is greenfield with no code, no repository and no pipeline, so no later story has a shared foundation to build and test on.

**Approach:** Initialize git, scaffold the React + Vite + MUI 9 web app with separate Counter and Manager/Owner entry points, and add a GitHub Actions pipeline that lints, tests and builds the frontend on every push. Record the exact React and Vite versions in the architecture spine.

**Decisions (2026-10-14, product owner):**
- Story 1.1 is split. This spec is the frontend half only. The backend half (.NET solution, health endpoint, EF Core + MySQL, migrations, backend tests, backend CI job, AD-13 code organization, local MySQL choice) is implemented by the product owner and tracked in `backend-1-1-checklist.md`. Story 1.1 is `done` in sprint status only when both halves are.
- Version control: git, hosted on GitHub; CI is GitHub Actions.

## Boundaries & Constraints

**Always:** React + Vite + MUI 9.1.x, TypeScript strict. Counter and Manager/Owner are separate HTML entry points in one codebase; client-routed SPA, no SSR. API calls go to versioned routes under `/api/v1`. No secrets committed. Leave a clearly marked place in the CI workflow for the backend job.

**Never:** Write, scaffold or modify any backend (.NET) file, project or CI step. No business screens, auth or routing beyond the two shells. No Counter platform interfaces (Epic 4). No service-worker logic. Do not create the GitHub remote or push (no `gh` CLI; the product owner does it).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Manager entry | open `/` | Manager/Owner shell renders with MUI theme | N/A |
| Counter entry | open `/counter.html` | Counter shell renders, title "Counter" | N/A |
| API reachable | `GET /api/v1/health` returns `{ "status": "ok" }` | Manager shell shows "API: ok" | N/A |
| API unreachable | backend not running / network error / non-200 / 200 with a body other than `{ "status": "ok" }` | Manager shell shows "API: unavailable"; page still usable | caught, no crash |

</frozen-after-approval>

## Code Map

Greenfield: repo holds only `_bmad/`, `_bmad-output/`, `.claude/`; not yet a git repo. Node 24.13.1, npm 11.8 installed.

- `_bmad-output/planning-artifacts/architecture/architecture-POS-System-2026-10-06/ARCHITECTURE-SPINE.md` -- Stack table rows "React" and "Vite" (~lines 198-199) get exact versions; remove the "Frontend versions" Deferred bullet. Touch nothing else.
- `_bmad-output/implementation-artifacts/backend-1-1-checklist.md` -- user-owned; do not edit during implementation.

## Tasks & Acceptance

**Execution:**
- [x] `.gitignore`, `.editorconfig`, `.gitattributes` (root) -- ignore node_modules, dist, .NET bin/obj, `.env*` (not `.env.example`), IDE files; `.gitattributes`: `* text=auto eol=lf` plus `*.sln text eol=crlf`; `.editorconfig` generic only (no C# analyzer rules, those are the owner's) -- shared conventions for both halves.
- [x] `git init` (default branch `main`) -- no commit, no remote -- product owner reviews and makes the first commit.
- [x] `frontend/` -- create with `npm create vite@<exact> frontend -- --template react-ts --no-interactive` (or hand-write the files if it prompts). Pin exact versions (no `^`): newest React that satisfies `@mui/material@9.1.x` peers, Emotion peers, newest Vite whose major is supported by the peers of `@vitejs/plugin-react` and `vitest`. Never `--legacy-peer-deps` or `overrides`. Commit-ready `package-lock.json` is generated and kept; `index.html` → `src/manager/main.tsx`, `counter.html` → `src/counter/main.tsx` (multi-page `build.rollupOptions.input`); `src/shared/theme.ts`, `src/shared/api/client.ts` (base URL from `import.meta.env.VITE_API_BASE_URL`, default `''`), `src/shared/api/health.ts` (`getHealth()` → `'ok' | 'unavailable'`); dev proxy `/api` → `http://localhost:5000` -- the two entry points.
- [x] `frontend/` tooling -- ESLint flat config (typescript-eslint, react-hooks, ignores `dist`), Vitest + Testing Library + jsdom with `globals: false` and explicit imports; scripts `dev`, `build`, `lint`, `test` (`vitest run`), `typecheck` (`tsc -b` or `tsc --noEmit`) -- quality gate.
- [x] `frontend/src/**/*.test.tsx` -- each shell renders; `getHealth` maps 200/ok, non-200, 200 with wrong body and network error (fetch mocked) -- covers I/O matrix.
- [x] `.github/workflows/ci.yml` -- on push and pull_request: `actions/setup-node` Node 24 with `cache: npm` and `cache-dependency-path: frontend/package-lock.json`, `defaults.run.working-directory: frontend`; `npm ci`, lint, typecheck, test, build; commented placeholder job `backend` -- CI.
- [x] `README.md` (root) -- prerequisites, frontend commands, note that backend setup is in progress by the owner -- onboarding.
- [x] Spine Stack table -- exact React and Vite versions; if React is held below latest because of MUI peers, say so in that row.

**Acceptance Criteria:**
- Given a fresh clone, when `npm ci && npm run lint && npm run typecheck && npm test && npm run build` run in `frontend/`, then all succeed and `dist/` has `index.html` and `counter.html`.
- Given the workflow file, when it is inspected, then it is valid YAML and runs exactly the local frontend commands. (Run on GitHub is verified by the product owner after the first push.)
- Given the spine, when this half is done, then the Stack table shows exact React and Vite versions.

## Implementation Notes

- Planning note: Vite's default `base: '/'` emits absolute asset paths that break under `file://`; Electron packaging of the Counter is deferred to Epic 4, so leave `base` unchanged now.
- 2026-10-14 implementation: versions React 19.3.0, Vite 8.3.4, MUI 9.1.2, Vitest 5.0.4. TypeScript held at 6.0.3 (typescript-eslint 8.71.2 supports < 6.1); jsdom held at 29.1.1 (30.x needs Node >= 24.15, local is 24.13.1). Extras beyond spec: `frontend/.env.example`, `.claude/settings.local.json` in `.gitignore`. First `vitest run` on this machine timed out once on worker startup; later runs ~3 s.
- Orchestrator verification (2026-10-14): clean `npm ci`, lint, typecheck, 9/9 tests, build (dist has `index.html` + `counter.html`) all pass. Matrix audit: Manager entry, Counter entry, API reachable, API unreachable (network error, non-200, wrong body) each covered by a passing test. No backend files present; git on `main`, no commits.
- Review patches applied (triage rows 1-4, 6-7, 9, 12-13, 15, 17). Re-verified 2026-10-14: clean `npm ci`, lint, typecheck, 14/14 tests in 4 files, build with both entries; also 14/14 with a `.env.local` setting `VITE_API_BASE_URL` (previously failed). One run reported "no tests" due to slow Vitest worker cold start on this PC (a later run took 30 s, mostly setup/environment); rerun passed. Watch for this flake.
- 2026-10-16 restructure (user decision): two GitHub repos, **frontend** and **backend**; nothing from `_bmad`, `_bmad-output` or `.claude` is pushed. The root `.git` was removed (it had no commits; a copy is in that session's scratchpad), and `frontend/` and `backend/` were each `git init -b main`. Root `.gitignore`/`.gitattributes`/`.editorconfig`/`.github`/`README.md` moved into `frontend/` (frontend rules only); CI is now `frontend/.github/workflows/ci.yml`, which runs from the repo root (no `working-directory`, default cache path) and has no backend placeholder. `backend/` got only hygiene files (.NET `.gitignore`, `.gitattributes`, `.editorconfig`). Execution rows for root files, `git init`, CI and README above describe the original layout. Re-verified: lint, typecheck, 14/14 tests, build pass.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|-------|---------|---------|----------|-------|
| 1 | verification-gap | `apiUrl` base-URL prefix and leading-slash normalization untested | medium | Pre-verified: no test imports `client.ts`; all tests run with empty base | patch |
| 2 | verification-gap, blind | CI does not assert `dist/index.html` + `dist/counter.html` exist | low | `ci.yml` only runs `npm run build`; dropping the `counter` input would stay green. One-line CI step | patch |
| 3 | verification-gap, blind, edge | Trailing slash in `VITE_API_BASE_URL` yields `//api/v1` | medium | `client.ts:6` plain concatenation; README invites setting this value | patch |
| 4 | blind, edge | Health fetch has no timeout; a hanging API leaves "API: checking…" forever | medium | `getHealth` has no signal; I/O matrix requires unreachable → unavailable | patch |
| 5 | edge | Fetch not aborted on unmount; StrictMode sends two health calls in dev | low | Real but harmless (dev only, result ignored via `active` flag); fix adds public surface | rejected |
| 6 | blind, edge | `health.test` exact-URL assertion fails when a dev has `.env.local` (as README suggests) | medium | Reproduced: with `.env.local` setting the URL, 1 of 6 tests fails | patch |
| 7 | blind | "API: checking…" initial state untested | low | `ManagerShell.test` asserts only settled states; direct assertion add | patch |
| 8 | blind | ESLint applies browser globals to Node config files; lint not type-aware | low | No Node globals used in config files today; type-aware lint is a design choice | rejected |
| 9 | blind, edge | CI runs twice per PR (push + pull_request, no filter) | low | `on: push` unfiltered; fix is `push: branches: [main]` | patch |
| 10 | blind | concurrency/timeout-minutes, `.nvmrc`/`packageManager` missing | low | Real but negligible for a solo repo; adds config | rejected |
| 11 | blind | `favicon.svg` not in diff, may be untracked | false | File exists at `frontend/public/favicon.svg`; orchestrator excluded it from the review diff only | rejected |
| 12 | blind | `health.test.tsx` has no JSX, should be `.ts` | low | Direct rename | patch |
| 13 | blind | `.gitignore` lacks `coverage/`; `*.local` too broad | low | `coverage/` direct add; `*.local` breadth harmless | patch (coverage only) |
| 14 | blind | Spine version rationale unverified; lockfile absent from diff | false | Checked `npm view`: MUI 9.1.2 peers React ^17–^19; plugin-react 6.1.2 and Vitest 5.0.4 accept Vite ^8. Lockfile excluded from review diff only; it exists | rejected |
| 15 | blind | `vite-env.d.ts` redeclares `ImportMeta` already in `vite/client` | low | Redundant interface; direct deletion | patch |
| 16 | edge | `#root` non-null assertion gives opaque error | low | Element is in both HTML files; state unreachable in practice | rejected |
| 17 | edge | Dev proxy key `/api` also matches `/api-docs` etc. | low | Vite prefix match; direct change to `/api/` | patch |
| 18 | edge | `.gitattributes` forces LF on future `.cmd/.bat` | low | No such files; unlikely; adds rules | rejected |
| 19 | edge | Binary types beyond the list could be normalized | false | `text=auto` detects binary content (NUL bytes) and does not normalize it | rejected |

## Verification

**Commands:**
- `cd frontend && npm ci && npm run lint && npm run typecheck && npm test && npm run build` -- expected: all exit 0
- `git status` -- expected: repo initialized on `main`, nothing committed, no backend files

**Manual checks (if no CLI):**
- `npm run dev`: `/` and `/counter.html` render their shells; with no backend running the Manager shell shows "API: unavailable".
