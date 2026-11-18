import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Link, useLocation } from 'react-router-dom'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { ThemeToggleButton } from '../../../shared/common/Buttons/ThemeToggleButton'
import type { NavItem } from '../navConfig'
import { useSidebarStyles } from './useSidebarStyles'
import { UserProfileMenu, type SidebarUserDisplay } from './UserProfileMenu'

export type { SidebarUserDisplay }

export type SidebarProps = {
  items: NavItem[]
  collapsed: boolean
  /** Omitted on the mobile/overlay drawer, which is always full-width and has no toggle. */
  onToggleCollapsed?: () => void
  /** Called after a nav item is chosen - the mobile drawer closes itself on navigation. */
  onNavigate?: () => void
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

  return (
    <Box sx={styles.root}>
      <Box sx={styles.brandRow}>
        {/* The theme toggle lives here only until a profile row exists to hold it instead -
            every session type gets one eventually (userDisplay only starts out null for the
            moment right after mount, while ManagerShell's own getUserDisplay call is still in
            flight), so this is a brief loading-state fallback, not a permanent one. */}
        {!userDisplay && <ThemeToggleButton color="inherit" />}
        {!collapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            POS System
          </Typography>
        )}
      </Box>

      {userDisplay && (
        <UserProfileMenu userDisplay={userDisplay} collapsed={collapsed} onSignOut={onSignOut} signingOut={signingOut} />
      )}

      {!collapsed && branchSelector && <Box sx={styles.branchSelectorRow}>{branchSelector}</Box>}

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
              {!collapsed && (
                <Typography variant="body2" noWrap sx={{ fontWeight: active ? 600 : 500 }}>
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
