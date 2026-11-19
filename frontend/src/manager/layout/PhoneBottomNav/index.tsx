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

  // Same longest-match-wins rule as Sidebar's own activeItemPath: with sibling items sharing a
  // path prefix (e.g. Home at "/owner" and Branches at "/owner/branches"), the first item whose
  // path is merely a prefix of the current one would otherwise win over the more specific match
  // further down the list - "/owner/branches" starts with "/owner/" too, so a plain `.find()``
  // marked Home active on the Branches screen.
  const currentPath = items.reduce<string | null>((bestPath, item) => {
    const matches = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    if (!matches) {
      return bestPath
    }
    return bestPath === null || item.path.length > bestPath.length ? item.path : bestPath
  }, null)
  const value = moreOpen ? 'more' : (currentPath ?? false)

  return (
    <BottomNavigation component="nav" aria-label="Main navigation" showLabels value={value} sx={styles.root}>
      {items.map((item) => (
        <BottomNavigationAction
          key={item.path}
          value={item.path}
          label={item.label}
          icon={item.icon}
          aria-current={currentPath === item.path ? 'page' : undefined}
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
