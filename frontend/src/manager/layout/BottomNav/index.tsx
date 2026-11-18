import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NavItem } from '../navConfig'
import { useBottomNavStyles } from './useBottomNavStyles'

export type BottomNavProps = {
  items: NavItem[]
  /** Whether the "More" sheet (the same mobile nav drawer ManagerShell already owns) is open. */
  moreOpen: boolean
  onMore: () => void
}

// The phone-width bottom navigation bar (see `frontend/CLAUDE.md`'s Layout section): the same
// destinations Sidebar shows, plus a "More" action that opens the existing mobile nav drawer
// (for sign-out and anything else the drawer alone carries) rather than duplicating that as a
// second sheet. Shown only below `tablet` - laptop+ has the permanent rail, tablet-to-laptop
// still uses the header's hamburger drawer alone, same as before this component existed.
export function BottomNav({ items, moreOpen, onMore }: BottomNavProps) {
  const styles = useBottomNavStyles()
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
