# Frontend conventions

## Architecture: feature-based

Each entry point (`manager/`, `counter/`) organizes its own screens under `src/<entry-point>/features/<feature-name>/`. Everything specific to one feature is colocated in that folder: its screen component(s), its own styles hook (`use<Component>Styles.ts`, same split-styles rule as shared components below), its own API calls, its own tests, and a `components/` subfolder for feature-only subcomponents. A feature never reaches into another feature's folder.

- Entry-point-level layout/shell (e.g. `ManagerShell.tsx`, routing) stays at the entry point's root, not inside `features/` — it isn't a feature, it's the shell features render into.
- Only code genuinely shared across multiple features or both entry points lives in `src/shared/`: `shared/common` for reusable UI components, `shared/api` for cross-cutting API helpers (e.g. the health check, the base HTTP client), `shared/theme` for the theme.
- Current example: `manager/features/auth/` (sign-in screen, the session route guard, the sign-in/session API calls) and `manager/features/super-admin/` (the authenticated Super Admin area, to grow with later stories like the Marts list).

## Shared reusable components

- Location: `src/shared/common/<Category>/<ComponentName>/`
  - `index.tsx` — the component itself
  - `use<ComponentName>Styles.tsx` — returns the style/`sx` objects consumed by `index.tsx`
- Example: `src/shared/common/Inputs/InputField/index.tsx` + `src/shared/common/Inputs/InputField/useInputFieldStyles.tsx`
- Never tightly couple a reusable component to a specific screen or feature: no page-specific copy, business logic, or API calls inside `src/shared/common`. Props in, UI out — it should be usable from both the Manager/Owner and Counter entry points.

## Theme

- Theme and MUI overrides are adapted (not copied verbatim) from another project's frontend: `C:\Users\MuhammadSuleman\Desktop\OfficeWork\vdk-tenent-projects\VDK-AccessAndControl\AccessAndControl.Frontend\src\ui\theme`.
- Structure to mirror: `palette(mode)`, `typography`, `shadows(mode)`, `customShadows(mode)`, `breakpoints`, `componentsOverrides(theme)`, combined by a single `AppThemeProvider`.
- Must support light and dark mode: default to the OS/browser preference (`prefers-color-scheme`) on first visit; let the user override with a manual toggle; persist the explicit choice (e.g. `localStorage`) across reloads.

## Screens

- Screens — especially first-impression ones like sign-in — should look considered and on-brand, not bare MUI defaults.

## Form fields

- Never use an asterisk (`*`) for a required-field indicator. Use the literal word `(required)` in parentheses, appended to the label text.
- A field's label is always shown in its shrunk/floating position (never the "label sits where the placeholder would go" resting state) with the placeholder visible inside the field at the same time.

## Loading and busy states

- A submit button is disabled for the whole duration of its action and shows a loading spinner (inside or beside the button) while submitting — never just disabled with no visual feedback, and never re-enabled until the action settles.
- Never use one global/full-screen spinner to cover a loading screen or section. Use skeleton placeholders (MUI `Skeleton` or equivalent) shaped like the content that is about to appear.

## Scrollbars

- Scrollable containers keep their scrollbar's layout space reserved (no content reflow) but hide the scrollbar visually until the user hovers that container; it appears on hover and hides again on mouse-leave.
