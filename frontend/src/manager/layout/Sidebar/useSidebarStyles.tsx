import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_HEADER_HEIGHT } from '../constants'

// Row-height/icon tokens ported 1:1 from the reference app's own rail (`RAIL` in
// AccessAndControl.Frontend's Sidebar/useSidebarStyles.ts) - this is the one component the user
// asked to match pixel-for-pixel, so unlike the rest of this app's theme (adapted, not copied,
// per frontend/CLAUDE.md) these numbers are taken verbatim rather than mapped onto this app's own
// spacing scale.
const RAIL = {
  px: '16px',
  collapsedPx: '6px',
  row: 44,
  rowWithCaption: 48,
  icon: 24,
}

// Style/sx objects for Sidebar. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles. Exported individually (not just as
// the returned object) so BranchSelector - which replaces the reference's CompanySelector but
// renders inside this same rail - can build its own row from the identical tokens, the same way
// the reference's CompanySelector imports its Sidebar's own useSidebarStyles.
export function useSidebarStyles({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme()
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  const railPx = collapsed ? RAIL.collapsedPx : RAIL.px
  const white = theme.palette.common.white

  // The navy field: the reference app has no light/dark variant of its own rail, but this app
  // does need one, so the rail is treated as its own themed surface rather than a hardcoded hex -
  // `primary.darker` (the brand navy) in light mode, the dark theme's own elevated-panel colour
  // in dark mode (same tone every card/paper already uses there - see shared/theme/palette.ts -
  // so the rail reads as "this app's dark mode", not a colour the toggle can't reach).
  const navy = theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.darker

  const root: SxProps<Theme> = {
    position: 'relative',
    width,
    flexShrink: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    bgcolor: navy,
    color: alpha(white, 0.8),
    overflow: 'visible',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter,
    }),
  }

  const brandRow: SxProps<Theme> = {
    height: SIDEBAR_HEADER_HEIGHT,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: railPx,
    justifyContent: collapsed ? 'center' : 'flex-start',
    color: white,
  }

  // The mixin every pressable row in the rail is built from (nav items, the profile row, the
  // Branch selector row, sign-out) - white at 80% until it is hovered or current, white 8% under
  // the pointer, a hairline that's always there so a row doesn't grow by a pixel when it becomes
  // current, and a white focus ring (the page's own blue ring disappears on navy).
  const row = (minHeight: number): SxProps<Theme> => ({
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    px: railPx,
    py: 0.5,
    minHeight,
    width: '100%',
    minWidth: 0,
    borderRadius: '12px',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'left',
    border: '1px solid transparent',
    // Several rows built from this mixin are native <button>s (the profile row, sign-out),
    // which otherwise keep the browser's own button face/font showing through underneath this
    // sx (background-color here only covers the hover state, not the resting one).
    background: 'none',
    font: 'inherit',
    color: alpha(white, 0.8),
    justifyContent: collapsed ? 'center' : 'flex-start',
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      color: white,
      bgcolor: alpha(white, 0.08),
    },
    '&:focus-visible': {
      outline: `2px solid ${white}`,
      outlineOffset: 2,
    },
    '& svg': { width: RAIL.icon, height: RAIL.icon, flexShrink: 0 },
  })

  // The profile row and the Branch selector row both carry a caption/second line, so they're a
  // little taller than a plain nav row - same `rowWithCaption` distinction as the reference.
  const rowWithCaption: SxProps<Theme> = row(RAIL.rowWithCaption)
  const userRow: SxProps<Theme> = rowWithCaption

  // The Owner's Branch filter, between the profile row and the nav list - BranchSelector applies
  // its own side inset via `rowWithCaption`, so this wrapper only spaces it from its neighbours.
  const branchSelectorRow: SxProps<Theme> = {
    flexShrink: 0,
    pb: 0.5,
  }

  // A chevron beside a row's label that flips over while its popover is open - shared by the
  // profile row and the Branch selector row, same as the reference app's own `chevron` token.
  const chevron = (open: boolean): SxProps<Theme> => ({
    display: 'flex',
    flexShrink: 0,
    color: 'inherit',
    transition: theme.transitions.create('transform', { duration: theme.transitions.duration.shorter }),
    transform: open ? 'rotate(180deg)' : 'none',
  })

  const navList: SxProps<Theme> = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    px: railPx,
    py: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  }

  const userAvatar: SxProps<Theme> = {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: white,
    bgcolor: alpha(white, 0.16),
  }

  // Small uppercase label above the destinations - `components/nav-subheader` in the reference:
  // 11/18 bold, uppercase, white at 72%.
  const groupTitle: SxProps<Theme> = {
    display: 'block',
    px: 1.5,
    pt: 0.5,
    pb: 0.75,
    fontSize: 11,
    lineHeight: '18px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: alpha(white, 0.72),
  }

  // Collapsed, that heading becomes a hairline instead of truncated text, same as the reference.
  const groupDivider: SxProps<Theme> = {
    mx: 1.5,
    mb: 1,
    borderTop: `1px solid ${alpha(white, 0.12)}`,
  }

  // The current row: primary.light on a primary wash, in a white hairline - the reference's own
  // `current` token.
  const navItem = (active: boolean): SxProps<Theme> => ({
    ...row(RAIL.row),
    ...(active && {
      color: theme.palette.primary.light,
      bgcolor: alpha(theme.palette.primary.main, 0.16),
      borderColor: alpha(white, 0.2),
      '&:hover': {
        color: theme.palette.primary.light,
        bgcolor: alpha(theme.palette.primary.main, 0.16),
      },
    }),
  })

  // Sign-out reuses the nav item's own look (never "active") so it reads as part of the same
  // list.
  const bottomSection: SxProps<Theme> = {
    flexShrink: 0,
    px: railPx,
    py: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  }

  const signOutItem: SxProps<Theme> = {
    ...navItem(false),
    width: '100%',
    border: 'none',
    background: 'none',
    font: 'inherit',
    cursor: 'pointer',
    '&:disabled': { cursor: 'default', opacity: 0.6 },
  }

  // The fold control sits ON the rail's own edge, half over the page, at the same spot whether
  // the rail is open or folded - position/size ported verbatim from the reference's
  // `collapseBtn`.
  const collapseToggleFloating: SxProps<Theme> = {
    position: 'absolute',
    top: 48,
    right: -20,
    zIndex: 1,
    width: 40,
    height: 40,
    color: white,
    bgcolor: navy,
    border: `1px solid ${alpha(white, 0.24)}`,
    // A step lighter than the rail itself, same hover treatment as every other row - keeps this
    // readable whichever surface colour `navy` resolves to for the current mode.
    '&:hover': { bgcolor: alpha(white, 0.08) },
    '&.Mui-focusVisible, &:focus-visible': {
      outline: `2px solid ${white}`,
      outlineOffset: 2,
    },
  }

  return {
    root,
    brandRow,
    row,
    rowWithCaption,
    userRow,
    branchSelectorRow,
    chevron,
    userAvatar,
    navList,
    groupTitle,
    groupDivider,
    navItem,
    bottomSection,
    signOutItem,
    collapseToggleFloating,
  }
}
