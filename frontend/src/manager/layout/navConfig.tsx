import type { ReactNode } from 'react'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

export type NavItem = {
  label: string
  icon: ReactNode
  path: string
}

// Super Admin's nav today is just Marts.
export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [{ label: 'Marts', icon: <StorefrontOutlinedIcon />, path: '/super-admin' }]

// Owner's nav today is just the placeholder landing area (Story 1.4 is activation/login only -
// Branches/staff/etc. are later stories). ManagerShell takes nav items as a prop per route group,
// so each signed-in area gets its own array here with no change needed to Sidebar/Header.
export const OWNER_NAV_ITEMS: NavItem[] = [{ label: 'Home', icon: <HomeOutlinedIcon />, path: '/owner' }]
