import type { ReactNode } from 'react'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

export type NavItem = {
  label: string
  icon: ReactNode
  path: string
}

// Super Admin's nav today is just Marts. Owner/Manager screens (Epic 2+) get their own array
// here, with ManagerShell choosing which one to render based on the signed-in session's type -
// no change needed to Sidebar/Header themselves when that happens.
export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [{ label: 'Marts', icon: <StorefrontOutlinedIcon />, path: '/super-admin' }]
