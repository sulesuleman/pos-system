// Shared sizing between ManagerShell, Sidebar, TabletTopBar, PhoneBottomNav and PageLayout, so
// the content column's own offset always matches whichever shell piece is actually on screen.
// Ported 1:1 (not adapted) from the reference app's own rail/shell
// (AccessAndControl.Frontend's Sidebar/useSidebarStyles.ts RAIL + ui/layout/*) per the
// pixel-for-pixel match asked for on this shell specifically.
export const SIDEBAR_EXPANDED_WIDTH = 284
export const SIDEBAR_COLLAPSED_WIDTH = 88
// The rail's own top row (brand/logo + collapse control) - reference's `RAIL.header`.
export const SIDEBAR_HEADER_HEIGHT = 80
// `tablet` (768) to `lg` (1200): TabletTopBar replaces the rail, and its own hamburger opens
// Sidebar in a left drawer - reference's own 64px MobileBar.
export const TABLET_TOPBAR_HEIGHT = 64
// Below `tablet`: PageLayout draws this logo bar itself (no separate component, same as the
// reference's own page-layout-logo-bar) since there's no rail or TabletTopBar at that width.
export const PHONE_LOGO_BAR_HEIGHT = 52
// PageLayout's gradient hero, laptop+ (reference's HEADING_HEIGHT) - a fixed height so the panel
// below it lands in the same place on every page.
export const PAGE_HERO_HEIGHT = 270
// The phone-width bottom navigation bar's own height - PageLayout and ScrollToTopButton both
// need to leave this much clearance (plus the safe-area inset) above it.
export const BOTTOM_NAV_HEIGHT = 64
