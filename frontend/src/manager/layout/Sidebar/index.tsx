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

export type SidebarProps = {
  items: NavItem[]
  collapsed: boolean
  /** Omitted on the mobile/overlay drawer, which is always full-width and has no toggle. */
  onToggleCollapsed?: () => void
  /** Called after a nav item is chosen - the mobile drawer closes itself on navigation. */
  onNavigate?: () => void
  onSignOut: () => void
  signingOut: boolean
}

// The nav rail shared by Super Admin and (later) Owner/Manager screens. Rendered twice by
// ManagerShell - once as a permanent sidebar (laptop+), once as a temporary overlay drawer
// (below laptop) - this component only knows how to draw the nav itself.
export function Sidebar({ items, collapsed, onToggleCollapsed, onNavigate, onSignOut, signingOut }: SidebarProps) {
  const styles = useSidebarStyles({ collapsed })
  const location = useLocation()

  return (
    <Box sx={styles.root}>
      <Box sx={styles.brandRow}>
        <ThemeToggleButton />
        {!collapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            POS System
          </Typography>
        )}
      </Box>

      <Box component="nav" sx={styles.navList}>
        {items.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
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

      {/* Floats straddling the sidebar's own right edge, half over the content beside it, at the
          same vertical position whether the rail is collapsed or expanded - only the icon's
          direction flips. */}
      {onToggleCollapsed && (
        <IconButton
          size="small"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={styles.collapseToggleFloating}
        >
          {collapsed ? <ChevronRightOutlinedIcon fontSize="small" /> : <ChevronLeftOutlinedIcon fontSize="small" />}
        </IconButton>
      )}
    </Box>
  )
}
