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

// Owner's nav: the placeholder landing area (Story 1.4) plus Branches (Story 1.6). ManagerShell
// takes nav items as a prop per route group, so each signed-in area gets its own array here with
// no change needed to Sidebar/Header.
export const OWNER_NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: <HomeOutlinedIcon />, path: '/owner' },
  { label: 'Branches', icon: <StorefrontOutlinedIcon />, path: '/owner/branches' },
]
