// Shared sizing between ManagerShell, Sidebar and Header, so the content area's own offset
// always matches whichever sidebar width is actually on screen. The two SIDEBAR_* widths are
// ported 1:1 (not adapted) from the reference app's own rail (`RAIL.width`/`RAIL.collapsedWidth`
// in AccessAndControl.Frontend's Sidebar/useSidebarStyles.ts) per the pixel-for-pixel match asked
// for on this component specifically.
export const SIDEBAR_EXPANDED_WIDTH = 284
export const SIDEBAR_COLLAPSED_WIDTH = 88
// The rail's own top row (brand/logo + collapse control), also ported from the reference's
// `RAIL.header` - intentionally not the same value as HEADER_HEIGHT below. The reference has no
// separate top app bar for its rail to line up with (unlike this app's Header, which merges the
// brand/hamburger row with the page heading - see frontend/CLAUDE.md), so matching the rail's own
// row height takes priority over keeping it level with Header's.
export const SIDEBAR_HEADER_HEIGHT = 80
export const HEADER_HEIGHT = 64
// The phone-width bottom navigation bar's own height (see BottomNav) - PageLayout and
// ScrollToTopButton both need to leave this much clearance (plus the safe-area inset) above it.
export const BOTTOM_NAV_HEIGHT = 64
