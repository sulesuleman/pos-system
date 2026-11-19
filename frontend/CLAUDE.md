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

## Data grids / tables

- Always use `src/shared/common/DataDisplay/StyledDataGrid` for any tabular/list UI — never a raw MUI `DataGrid` or an ad-hoc table. It wraps `@mui/x-data-grid` with this app's table-card styling, infinite scroll (`onLoadMore`/`loadingMore`), drag-to-scroll, a mobile card layout below `laptop` (`renderMobileCard` or `columnCards`), a loaded/total footer, and an overflow-tooltip default cell renderer.
- Adapted from `C:\Users\MuhammadSuleman\Desktop\OfficeWork\vdk-tenent-projects\VDK-AccessAndControl\AccessAndControl.Frontend\src\ui\components\DataGrid\PrimaryGrid.tsx`, deliberately trimmed: no `GridFilters`/filter-dialog system, no `inCard` prop (it always draws its own card), no dead pagination props, no `react-i18next` (plain strings — this app has no i18n setup).
- `src/shared/common/DataDisplay/OverflowTooltip` (single-line text, truncates with an ellipsis, shows the full value in a tooltip only when actually overflowing) is its own shared component too, not just an internal piece of the grid — reuse it anywhere else long text might get cut off (cards, etc.).

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

## Manager/Owner shell layout

Rebuilt (2026-11-19) to match the reference project's shell pixel-for-pixel, not just a loose adaptation — same source: `AccessAndControl.Frontend/src/ui/layout/*` (`AppLayoutContent.tsx`, `TabletTopBar.tsx`, `PhoneBottomNav.tsx`) and `ui/components/{Sidebar,PageLayout}`. Icons stay `@mui/icons-material` (not `iconsax-react`/`HandoffIcon`) — glyph set differs, layout/spacing match exactly.

- **Breakpoints** (`shared/theme/breakpoints.ts`): the rail↔drawer cut is `lg` (1200), same value the reference uses — not `laptop` (1024). The phone↔tablet cut stays `tablet` (768), same as the reference.
- **Three shell pieces, one `Sidebar`, switched by CSS breakpoint (not JS media queries) so all three stay mounted**: `ManagerShell.tsx` renders the permanent rail (`lg`+), `TabletTopBar` (`tablet`–`lg`, its own gradient bar with a hamburger), and `PhoneBottomNav` (below `tablet`, fixed destinations + "More"). The tablet band's hamburger and the phone's "More" open the *same* `Drawer` — anchored `left` on tablet, `bottom` (a sheet) on phone, both carrying `Sidebar` itself, same as the reference's `AppLayoutContent`.
- `Sidebar` (`manager/layout/Sidebar`) draws itself one of three ways from props, never from its own breakpoint check: the permanent rail (`collapsed`, `onToggleCollapsed`, no `onClose`), the tablet drawer (`onClose`, nav items shown), or the phone sheet (`onClose`, `hideNavItems` — the destinations `PhoneBottomNav` already carries are left out, same idea as the reference's `hiddenItemIds` but as an all-or-nothing switch since this app's nav lists are short).
- `PageLayout` (`manager/layout/PageLayout`) replaces the old flat `Header` + plain scroll panel entirely: it now draws the reference's gradient hero (fixed `PAGE_HERO_HEIGHT` on `lg`+, content-sized and self-painting its own gradient below it) pinned (`position: sticky; top: 0`) behind the white/canvas panel, which is in normal flow and scrolls up over it — one rounded top-left corner, one scroll container. Below `tablet` it also draws its own 52px logo bar (no `TabletTopBar` at that width). Still fed by `PageHeaderProvider`/`pageHeaderStore` (heading/subheading/icon/`onBack`/breadcrumbs/`rightContent`/tabs) — a route declares its header via `usePageHeader`, same as before; `PageLayout` itself takes no props. `ScrollToTopButton` (already a generic `shared/common` component) is reused directly as the hero's "back to top" fab instead of writing a separate one.
- **Deliberately not ported**: a global search box (nothing to search yet); the reference's own `logo`/company-logo prop on `PageLayout` (no per-company concept here).
- `Sidebar`'s user-identity row is its own component, `Sidebar/UserProfileMenu` (not inlined in `Sidebar/index.tsx`), mirroring the reference app's own `Sidebar/UserProfile`. Every signed-in area supplies `ManagerShell`'s `getUserDisplay` today (including Super Admin, via a fixed `{ name: 'Super Admin' }` label — its own session endpoint carries no identifying fields yet), so `userDisplay` is only ever null for the brief moment right after mount, not permanently for any session type; `Sidebar`'s brand-row theme toggle and bottom-row sign-out button are that loading-state fallback, not a Super-Admin-specific one.
- The reference's `CompanySelector` is replaced, not omitted: this app has nothing to switch Marts between (one Mart per Owner session), but the Owner does need to scope which Branches they're viewing (AD-16/FR-18) — `manager/features/owner/branches/BranchSelector` (its own `index.tsx` + `useBranchSelectorStyles.tsx`, same folder-per-component convention as a shared component) fills that slot instead, passed into `ManagerShell`'s `branchSelector` prop. It's self-contained (owns its own selection state) since no screen consumes the filter yet; lift the state up once one does, rather than threading an `onChange` through for no current caller. Hidden entirely when the sidebar is collapsed, same as nav-item labels. It stays in `features/owner/branches/` rather than moving into `Sidebar/` itself (unlike the reference's co-located `CompanySelector`) — it's Owner-only business logic injected via a prop, and `Sidebar` stays owner-agnostic.
- The theme toggle moved off the brand row and into the profile menu (`UserProfileMenu`'s own Appearance row, which opens a Light/Dark submenu) for any session type that has a `userDisplay` — see above for when that isn't the case.
- `UserProfileMenu`'s menus are built on `shared/common/Menu`'s `StyledMenu` (ported from the reference's own `SMenu`/`FMenu.tsx`) — a data-driven `items: StyledMenuItemConfig[]` list instead of hand-written `MenuItem`s, so a new row (icon/label/`hasSubmenu`/`divider`/`color: 'error'`/`active`) is a config entry, not new JSX.
- Test note: `jsdom` in this repo's test setup does not evaluate `@media` breakpoints against a real viewport, so CSS-only `display: { xs, tablet, lg }` switches never actually hide a shell piece in a test — every piece is "visible" to Testing Library regardless of the breakpoint value chosen. The one place this app does use a JS `useMediaQuery` (choosing the shared Drawer's `anchor`: `left` vs `bottom`) always resolves to its `false` branch under tests instead, which is harmless (just a visual anchor, asserted only via snapshot/manual check, never by a unit test).

## Scrollbars

- Scrollable containers hide the scrollbar visually until the user hovers that container; it appears on hover and hides again on mouse-leave.
- Deliberately no global scrollbar-gutter reservation (plain `overflow-y: auto`, not `scrollbar-gutter: stable`, applied globally): reserving a scrollbar's width ahead of time avoids reflow when the bar appears, but only on the one element that scrolls, never on its non-scrolling siblings - and a scrollable box in this app almost always sits beside one that must match its width exactly (a dialog's content vs. its actions row, a sheet's content vs. its footer, a nav list vs. its sign-out row). That one-sided reservation caused three separate width-mismatch bugs (2026-11-17), so this app accepts the occasional reflow-on-scrollbar-appearance instead of permanently misaligned siblings. A component that deliberately needs the gutter reserved for its own reason (e.g. keeping its own content centered through a scroll) can still set `scrollbarGutter` itself - just not as a global default.
