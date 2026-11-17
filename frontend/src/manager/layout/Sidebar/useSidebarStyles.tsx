import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { HEADER_HEIGHT, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from '../constants'

// Style/sx objects for Sidebar. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useSidebarStyles({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme()
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  const root: SxProps<Theme> = {
    position: 'relative',
    width,
    flexShrink: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    // A contrasting surface (the same tone as a content card) so the sidebar reads as a
    // prominent panel rather than blending into the page the way the header does.
    bgcolor: 'background.paper',
    transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
  }

  const brandRow: SxProps<Theme> = {
    height: HEADER_HEIGHT,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: collapsed ? 0 : 2.5,
    justifyContent: collapsed ? 'center' : 'flex-start',
  }

  const navList: SxProps<Theme> = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    // The global scrollbar-gutter reservation (css-baseline.tsx) only reserves space on this
    // box's trailing edge, which silently shifts its centered nav items left of the rail's true
    // centre. Reserving it on both edges keeps that space symmetric so centering isn't skewed.
    scrollbarGutter: 'stable both-edges',
    px: collapsed ? 1 : 1.5,
    py: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  }

  const navItem = (active: boolean): SxProps<Theme> => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    borderRadius: '10px',
    px: collapsed ? 0 : 1.5,
    py: 1,
    justifyContent: collapsed ? 'center' : 'flex-start',
    color: active ? 'primary.main' : 'text.secondary',
    bgcolor: active ? theme.palette.primary.shades[8] : 'transparent',
    textDecoration: 'none',
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      bgcolor: active ? theme.palette.primary.shades[12] : theme.palette.action.hover,
    },
    '& svg': { fontSize: 22, flexShrink: 0 },
  })

  // Sign-out reuses the nav item's own look (never "active") so it reads as part of the same
  // list.
  const bottomSection: SxProps<Theme> = {
    flexShrink: 0,
    px: collapsed ? 1 : 1.5,
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

  // A small circular button straddling the sidebar's own right edge, half over the content
  // beside it - a floating toggle, at the same vertical position whether the rail is collapsed
  // or expanded, rather than one more row taking up sidebar space.
  const collapseToggleFloating: SxProps<Theme> = {
    position: 'absolute',
    top: '50%',
    right: -14,
    transform: 'translateY(-50%)',
    zIndex: 1,
    width: 28,
    height: 28,
    bgcolor: 'background.paper',
    boxShadow: theme.customShadows.z8,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': { bgcolor: theme.palette.action.hover },
  }

  return {
    root,
    brandRow,
    navList,
    navItem,
    bottomSection,
    signOutItem,
    collapseToggleFloating,
  }
}
