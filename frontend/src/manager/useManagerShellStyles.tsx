import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './layout/constants'

// Style/sx objects for ManagerShell. Kept separate from the component per this app's
// shared-component convention, applied here too since this is the shell every authenticated
// screen renders inside.
export function useManagerShellStyles({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const theme = useTheme()
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  // Fixed to the viewport, not scrolling with the page - PageLayout's own container is the one
  // surface that scrolls (see usePageLayoutStyles), mirroring the reference app's shell.
  const root: SxProps<Theme> = {
    height: '100vh',
    overflow: 'hidden',
    bgcolor: 'background.background',
  }

  // Fixed alongside the page (not the content column), so it never scrolls with the content -
  // only visible laptop+; below that, the temporary drawer takes over instead.
  const permanentSidebar: SxProps<Theme> = {
    display: { xs: 'none', laptop: 'flex' },
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
    ml: { xs: 0, laptop: `${sidebarWidth}px` },
    transition: theme.transitions.create('margin-left', { duration: theme.transitions.duration.shorter }),
  }

  return { root, permanentSidebar, contentColumn }
}
