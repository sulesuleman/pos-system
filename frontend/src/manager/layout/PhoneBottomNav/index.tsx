import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NavItem } from '../navConfig'
import { usePhoneBottomNavStyles } from './usePhoneBottomNavStyles'

export type PhoneBottomNavProps = {
  items: NavItem[]
  /** Whether the "More" sheet (Sidebar rendered full-width, with its own nav items hidden - see
   * Sidebar's `hideNavItems`) is open. */
  moreOpen: boolean
  onMore: () => void
}

// The phone-width bottom navigation bar, below `tablet` - the same destinations Sidebar shows,
// plus a "More" action that opens Sidebar itself as a bottom sheet (for the account row, Branch
// filter and sign-out) rather than duplicating that as a second component. Ported from the
// reference app's own PhoneBottomNav (AccessAndControl.Frontend's ui/layout/PhoneBottomNav.tsx).
export function PhoneBottomNav({ items, moreOpen, onMore }: PhoneBottomNavProps) {
  const styles = usePhoneBottomNavStyles()
  const location = useLocation()
  const navigate = useNavigate()

  const current = items.find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
  const value = moreOpen ? 'more' : (current?.path ?? false)

  return (
    <BottomNavigation component="nav" aria-label="Main navigation" showLabels value={value} sx={styles.root}>
      {items.map((item) => (
        <BottomNavigationAction
          key={item.path}
          value={item.path}
          label={item.label}
          icon={item.icon}
          aria-current={current?.path === item.path ? 'page' : undefined}
          onClick={() => navigate(item.path)}
          sx={styles.item}
        />
      ))}
      <BottomNavigationAction
        value="more"
        label="More"
        icon={<MenuOutlinedIcon />}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        onClick={onMore}
        sx={styles.item}
      />
    </BottomNavigation>
  )
}
