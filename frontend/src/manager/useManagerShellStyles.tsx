import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './layout/constants'

// Style/sx objects for ManagerShell. Kept separate from the component per this app's
// shared-component convention, applied here too since this is the shell every authenticated
// screen renders inside. Breakpoint ported 1:1 from the reference app's own shell
// (AccessAndControl.Frontend's ui/layout/AppLayoutContent.tsx): the permanent rail gives way to
// a drawer at `lg` (its own 1200), not this app's `laptop` (1024).
export function useManagerShellStyles({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const theme = useTheme()
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  // The gradient field behind everything - the reference's own `layoutMainContainer` - so the
  // rail, TabletTopBar and PageLayout's phone logo bar/hero all sit on the same painted surface
  // rather than each carrying their own patch of it.
  const root: SxProps<Theme> = {
    height: '100vh',
    overflow: 'hidden',
    background: theme.palette.gradients.field,
  }

  // Fixed alongside the page (not the content column), so it never scrolls with the content -
  // only visible `lg`+; below that, the temporary drawer takes over instead.
  const permanentSidebar: SxProps<Theme> = {
    display: { xs: 'none', lg: 'flex' },
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: theme.zIndex.drawer,
  }

  const contentColumn: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    ml: { xs: 0, lg: `${sidebarWidth}px` },
    transition: theme.transitions.create('margin-left', { duration: theme.transitions.duration.shorter }),
  }

  return { root, permanentSidebar, contentColumn }
}
