import type { ReactNode } from 'react'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

export type NavItem = {
  label: string
  icon: ReactNode
  path: string
}

// Super Admin's nav today is just Marts.
export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [{ label: 'Marts', icon: <StorefrontOutlinedIcon />, path: '/super-admin' }]

// Owner's nav: the placeholder landing area (Story 1.4), Branches (Story 1.6), Staff (Story 2.2
// - create/list staff with any Role) and Roles (Story 2.1 - build Roles from the Permission
// list). ManagerShell takes nav items as a prop per route group, so each signed-in area gets its
// own array here with no change needed to Sidebar/Header.
export const OWNER_NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: <HomeOutlinedIcon />, path: '/owner' },
  { label: 'Branches', icon: <StorefrontOutlinedIcon />, path: '/owner/branches' },
  { label: 'Staff', icon: <GroupOutlinedIcon />, path: '/owner/staff' },
  { label: 'Roles', icon: <BadgeOutlinedIcon />, path: '/owner/roles' },
]

// Manager's nav (Epic 2 minimal slice): just the placeholder landing area for now - no custom-
// Role/Permission UI or Branch-scoped screens exist yet to put here.
export const MANAGER_NAV_ITEMS: NavItem[] = [{ label: 'Home', icon: <HomeOutlinedIcon />, path: '/manager' }]
