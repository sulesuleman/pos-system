import { useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import { useNavigate } from 'react-router-dom'
import { PageHeaderProvider } from './layout/PageHeaderProvider'
import { PageLayout } from './layout/PageLayout'
import { Sidebar } from './layout/Sidebar'
import { SIDEBAR_EXPANDED_WIDTH } from './layout/constants'
import type { NavItem } from './layout/navConfig'
import { useSidebarCollapsed } from './layout/useSidebarCollapsed'
import { useManagerShellStyles } from './useManagerShellStyles'

export type ManagerShellProps = {
  /** Which nav rail to draw - distinct per signed-in area (Super Admin, Owner, ...). */
  navItems: NavItem[]
  /** The session-type-specific sign-out API call only; this component handles the shared
   * loading state and redirect itself. */
  onSignOut: () => Promise<unknown>
  /** Where to send the user once sign-out settles - that area's own sign-in route. */
  signOutRedirectPath: string
}

// Layout-only root for the Manager/Owner entry point: a sidebar alongside PageLayout, which owns
// the header and the one surface that scrolls (see PageLayout). This is the exclusively-
// authenticated shell (post Story 1.2's routing fix), so sign-out lives here rather than in any
// individual screen. Nav items and the sign-out call are passed in per route group (see main.tsx)
// since Super Admin and Owner are different session types with their own nav and their own
// sign-out endpoint - Sidebar/Header themselves need no changes for this.
export function ManagerShell({ navItems, onSignOut, signOutRedirectPath }: ManagerShellProps) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const styles = useManagerShellStyles({ sidebarCollapsed: collapsed })

  async function handleSignOut() {
    setSigningOut(true)
    await onSignOut()
    // Sign-out clears local auth UI state and redirects regardless of whether the server call
    // succeeded — never leaves the UI stuck showing "signed in".
    navigate(signOutRedirectPath, { replace: true })
  }

  return (
    <PageHeaderProvider>
      <Box sx={styles.root}>
        <Box sx={styles.permanentSidebar}>
          <Sidebar
            items={navItems}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
          />
        </Box>

        <Drawer
          variant="temporary"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', laptop: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_EXPANDED_WIDTH } }}
        >
          <Sidebar
            items={navItems}
            collapsed={false}
            onNavigate={() => setMobileNavOpen(false)}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
          />
        </Drawer>

        <Box sx={styles.contentColumn}>
          <PageLayout onOpenMobileNav={() => setMobileNavOpen(true)} />
        </Box>
      </Box>
    </PageHeaderProvider>
  )
}
