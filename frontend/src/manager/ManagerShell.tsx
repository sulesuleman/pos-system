import { useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../shared/api/superAdminAuth'
import { PageHeaderProvider } from './layout/PageHeaderProvider'
import { PageLayout } from './layout/PageLayout'
import { Sidebar } from './layout/Sidebar'
import { SIDEBAR_EXPANDED_WIDTH } from './layout/constants'
import { SUPER_ADMIN_NAV_ITEMS } from './layout/navConfig'
import { useSidebarCollapsed } from './layout/useSidebarCollapsed'
import { useManagerShellStyles } from './useManagerShellStyles'

// Layout-only root for the Manager/Owner entry point: a sidebar (Super Admin today; Owner/
// Manager nav once those screens exist) alongside PageLayout, which owns the header and the one
// surface that scrolls (see PageLayout). This is the exclusively-authenticated shell (post
// Story 1.2's routing fix), so sign-out lives here rather than in any individual screen.
export function ManagerShell() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const styles = useManagerShellStyles({ sidebarCollapsed: collapsed })

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sign-out clears local auth UI state and redirects regardless of whether the server call
    // succeeded — never leaves the UI stuck showing "signed in".
    navigate('/super-admin/sign-in', { replace: true })
  }

  return (
    <PageHeaderProvider>
      <Box sx={styles.root}>
        <Box sx={styles.permanentSidebar}>
          <Sidebar
            items={SUPER_ADMIN_NAV_ITEMS}
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
            items={SUPER_ADMIN_NAV_ITEMS}
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
