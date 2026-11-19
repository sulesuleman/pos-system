import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeaderProvider } from './layout/PageHeaderProvider'
import { PageLayout } from './layout/PageLayout'
import { Sidebar, type SidebarUserDisplay } from './layout/Sidebar'
import { TabletTopBar } from './layout/TabletTopBar'
import { PhoneBottomNav } from './layout/PhoneBottomNav'
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
  /** Fetches what to show about the signed-in account in the sidebar (name, Role/Mart caption) -
   * every signed-in area supplies one today, so Sidebar's UserProfileMenu always ends up
   * rendering once it resolves; still optional since it's meaningless before anyone's signed in. */
  getUserDisplay?: () => Promise<SidebarUserDisplay | null>
  /** The Owner's Branch filter (AD-16/FR-18) - omitted for session types with nothing to scope
   * by Branch (e.g. Super Admin, and Manager once that exists, which is hard-scoped to one
   * Branch and gets no selector at all). */
  branchSelector?: ReactNode
}

// Layout-only root for the Manager/Owner entry point: a sidebar alongside PageLayout, which owns
// the header and the one surface that scrolls (see PageLayout). This is the exclusively-
// authenticated shell (post Story 1.2's routing fix), so sign-out lives here rather than in any
// individual screen. Nav items and the sign-out call are passed in per route group (see main.tsx)
// since Super Admin and Owner are different session types with their own nav and their own
// sign-out endpoint - Sidebar/Header themselves need no changes for this.
export function ManagerShell({ navItems, onSignOut, signOutRedirectPath, getUserDisplay, branchSelector }: ManagerShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  // Which of the drawer's two shapes to use - a left drawer for the tablet band's own hamburger,
  // a bottom sheet for the phone's "More" action - same single Drawer either way (reference's own
  // AppLayoutContent). Below `tablet` only; the tablet band keeps `lg`'s own drawer form.
  const isPhone = useMediaQuery(theme.breakpoints.down('tablet'))
  const [signingOut, setSigningOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userDisplay, setUserDisplay] = useState<SidebarUserDisplay | null>(null)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const styles = useManagerShellStyles({ sidebarCollapsed: collapsed })
  const activeRef = useRef(true)

  useEffect(() => {
    // Closes the drawer on route change; there's no prop/render-time value to derive this from,
    // it's a reaction to navigation (same justified exception as the reference app's own
    // AppLayoutContent).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  // Referenced from the effect below rather than called inline, so the fetch-on-mount pattern
  // reads the same as every other "load on mount" component here (e.g. MartsList) instead of
  // calling setState directly in the effect body.
  const loadUserDisplay = useCallback(() => {
    if (!getUserDisplay) {
      return
    }
    void getUserDisplay().then((result) => {
      if (activeRef.current) {
        setUserDisplay(result)
      }
    })
  }, [getUserDisplay])

  useEffect(() => {
    loadUserDisplay()
  }, [loadUserDisplay])

  async function handleSignOut() {
    setSigningOut(true)
    await onSignOut()
    // Sign-out clears local auth UI state and redirects regardless of whether the server call
    // succeeded — never leaves the UI stuck showing "signed in".
    navigate(signOutRedirectPath, { replace: true })
  }

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <PageHeaderProvider>
      <Box sx={styles.root}>
        {/* The permanent rail - `lg`+ only; every narrower band uses the Drawer below instead. */}
        <Box sx={styles.permanentSidebar}>
          <Sidebar
            items={navItems}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
            userDisplay={userDisplay}
            branchSelector={branchSelector}
          />
        </Box>

        <Box sx={styles.contentColumn}>
          {/* The tablet band's own top bar (`tablet` to `lg`) - its hamburger opens the same
              drawer the phone's "More" action does. Rendered directly (no wrapping Box): its own
              root style already carries the breakpoint `display`, and `contentColumn`'s default
              `align-items: stretch` (flexDirection: column) is what gives it a definite width to
              stretch to - a wrapping Box here, with no width of its own, would default to
              `flex: 0 1 auto` and only hug its content's width instead, leaving Typography's
              `flex: 1` nothing to grow into (the hamburger then sits right next to the label
              instead of at the bar's far end). */}
          <TabletTopBar menuOpen={mobileNavOpen} onMenu={() => setMobileNavOpen(true)} />

          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PageLayout />
          </Box>
        </Box>

        {/* Below `tablet`: the fixed bottom nav, whose "More" opens the same drawer as the
            tablet band's hamburger above. */}
        <PhoneBottomNav items={navItems} moreOpen={mobileNavOpen} onMore={() => setMobileNavOpen(true)} />

        {/* One drawer, two shapes - a left drawer for the tablet band, a bottom sheet for the
            phone - both carrying the rail itself (reference's own AppLayoutContent). The phone
            sheet hides the destinations PhoneBottomNav already shows. */}
        <Drawer
          anchor={isPhone ? 'bottom' : 'left'}
          variant="temporary"
          open={mobileNavOpen}
          onClose={closeMobileNav}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': isPhone
              ? { width: '100%', maxHeight: '90dvh', borderTopLeftRadius: 16, borderTopRightRadius: 16, pb: 'env(safe-area-inset-bottom)' }
              : { width: SIDEBAR_EXPANDED_WIDTH, maxWidth: 'calc(100vw - 56px)' },
          }}
        >
          <Sidebar
            items={navItems}
            collapsed={false}
            hideNavItems={isPhone}
            onNavigate={closeMobileNav}
            onClose={closeMobileNav}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
            userDisplay={userDisplay}
            branchSelector={branchSelector}
          />
        </Drawer>
      </Box>
    </PageHeaderProvider>
  )
}
