import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Link, useLocation } from 'react-router-dom'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { Logo } from '../../../shared/common/Brand/Logo'
import { ThemeToggleButton } from '../../../shared/common/Buttons/ThemeToggleButton'
import type { NavItem } from '../navConfig'
import { useSidebarStyles } from './useSidebarStyles'
import { UserProfileMenu, type SidebarUserDisplay } from './UserProfileMenu'

export type { SidebarUserDisplay }

export type SidebarProps = {
  items: NavItem[]
  collapsed: boolean
  /** Omitted on the tablet drawer / phone sheet forms, which are always full-width and have no
   * fold control - same rail/drawer distinction as the reference app's own Sidebar. */
  onToggleCollapsed?: () => void
  /** Called after a nav item is chosen - the tablet drawer and phone sheet close on navigation. */
  onNavigate?: () => void
  /** The drawer/sheet forms carry a close button at the end of the brand row instead of the
   * rail's fold control (reference's own Sidebar `onClose`). Omitted on the permanent rail. */
  onClose?: () => void
  /** The phone sheet leaves out the destinations PhoneBottomNav already carries, same as the
   * reference's own `hiddenItemIds` - this app's nav lists are short enough that it's an
   * all-or-nothing switch rather than a per-id set. */
  hideNavItems?: boolean
  onSignOut: () => void
  signingOut: boolean
  userDisplay?: SidebarUserDisplay | null
  /** Owner's Branch filter (AD-16/FR-18) - omitted for session types with nothing to scope by
   * Branch (e.g. Super Admin). Hidden while collapsed, same as the nav item labels. */
  branchSelector?: ReactNode
}

// The nav rail shared by Super Admin and (later) Owner/Manager screens. Rendered twice by
// ManagerShell - once as a permanent sidebar (laptop+), once as a temporary overlay drawer
// (below laptop) - this component only knows how to draw the nav itself. The signed-in account
// row (UserProfileMenu) and the Owner's Branch filter (branchSelector) are their own components,
// same as the reference app's own Sidebar/UserProfile and Sidebar/CompanySelector.
export function Sidebar({
  items,
  collapsed,
  onToggleCollapsed,
  onNavigate,
  onClose,
  hideNavItems = false,
  onSignOut,
  signingOut,
  userDisplay,
  branchSelector,
}: SidebarProps) {
  const styles = useSidebarStyles({ collapsed })
  const location = useLocation()

  // A nav item is active on an exact path match or on one of its own sub-routes - but with
  // sibling items sharing a path prefix (e.g. Home at "/owner" and Branches at
  // "/owner/branches"), matching each item independently marks BOTH active on "/owner/branches".
  // Pick only the longest (most specific) matching path instead, so a sub-route's own item wins.
  const activeItemPath = items.reduce<string | null>((bestPath, item) => {
    const matches = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    if (!matches) {
      return bestPath
    }
    return bestPath === null || item.path.length > bestPath.length ? item.path : bestPath
  }, null)

  // The tablet drawer and the phone sheet both carry the rail at full width/height - the
  // drawer's own Paper already sizes itself (fixed 284 for the tablet drawer, 100% for the
  // phone sheet - see ManagerShell), but Sidebar's own root otherwise always sets a fixed
  // 284/88 width for the permanent rail, same as the reference's own `inDrawer`/`mobile`
  // override on its Sidebar root.
  const isDrawerForm = Boolean(onClose)

  return (
    <Box sx={[styles.root, isDrawerForm && { width: '100%', height: '100%' }]}>
      <Box sx={styles.brandRow}>
        <Logo />
        {/* The reference's own equivalent label here (CompanySelector's company name) renders
            at its row's plain text weight (500), never bold - matched here rather than the
            700 this had drifted to. */}
        {!collapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 500, flex: 1, minWidth: 0 }}>
            POS System
          </Typography>
        )}
        {/* The theme toggle lives here only until a profile row exists to hold it instead -
            every session type gets one eventually (userDisplay only starts out null for the
            moment right after mount, while ManagerShell's own getUserDisplay call is still in
            flight), so this is a brief loading-state fallback, not a permanent one. */}
        {!userDisplay && <ThemeToggleButton color="inherit" />}
        {onClose && (
          <IconButton aria-label="Close" onClick={onClose} sx={styles.closeButton}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {(userDisplay || (!collapsed && branchSelector)) && (
        <Box sx={styles.topStack}>
          {userDisplay && (
            <UserProfileMenu userDisplay={userDisplay} collapsed={collapsed} onSignOut={onSignOut} signingOut={signingOut} />
          )}
          {!collapsed && branchSelector}
        </Box>
      )}

      {!hideNavItems && (
        <Box component="nav" aria-label="Main navigation" sx={styles.navList}>
          {collapsed ? (
            <Box sx={styles.groupDivider} />
          ) : (
            <Typography component="span" sx={styles.groupTitle}>
              Navigation
            </Typography>
          )}
          {items.map((item) => {
            const active = item.path === activeItemPath
            const link = (
              <Box key={item.path} component={Link} to={item.path} onClick={onNavigate} sx={styles.navItem(active)}>
                {item.icon}
                {/* Constant weight 500 whether active or not - same as the reference's own
                    `navItemText` (its SidebarNavItem never bolds the active row, only its
                    colour changes). */}
                {!collapsed && (
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {item.label}
                  </Typography>
                )}
              </Box>
            )
            return collapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right">
                {link}
              </Tooltip>
            ) : (
              link
            )
          })}
        </Box>
      )}

      {/* Same loading-state fallback as the brand row's theme toggle above - once userDisplay
          loads for any session type, Sign out lives in UserProfileMenu's own main menu instead
          (the reference app's own Logout row), not here. */}
      {!userDisplay && (
        <Box sx={styles.bottomSection}>
          {collapsed ? (
            <Tooltip title="Sign out" placement="right">
              <Box component="button" type="button" onClick={onSignOut} disabled={signingOut} sx={styles.signOutItem} data-testid="sign-out-button">
                <LogoutOutlinedIcon />
              </Box>
            </Tooltip>
          ) : (
            <Box component="button" type="button" onClick={onSignOut} disabled={signingOut} sx={styles.signOutItem} data-testid="sign-out-button">
              <LogoutOutlinedIcon />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Sign out
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Floats straddling the sidebar's own right edge, half over the content beside it, at the
          same vertical position whether the rail is collapsed or expanded - only the icon's
          direction flips. */}
      {onToggleCollapsed && (
        <IconButton
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={styles.collapseToggleFloating}
        >
          {collapsed ? <ChevronRightOutlinedIcon /> : <ChevronLeftOutlinedIcon />}
        </IconButton>
      )}
    </Box>
  )
}
