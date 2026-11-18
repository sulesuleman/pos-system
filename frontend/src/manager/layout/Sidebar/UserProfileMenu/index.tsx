import { useState } from 'react'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import { StyledMenu, type StyledMenuItemConfig } from '../../../../shared/common/Menu'
import { useThemeMode } from '../../../../shared/theme/theme-mode'
import { useSidebarStyles } from '../useSidebarStyles'

// What's shown about the signed-in account - name plus an optional Role/Mart caption. Null (or
// not passed at all) means Sidebar omits this component, which is only ever true briefly: every
// session type supplies a getUserDisplay to ManagerShell, so userDisplay starts out null only
// until that call resolves.
export type SidebarUserDisplay = {
  name: string
  caption?: string
}

export type UserProfileMenuProps = {
  userDisplay: SidebarUserDisplay
  collapsed: boolean
  onSignOut: () => void
  signingOut: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return ''
  }
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// The signed-in account row, above the Sidebar's nav list - a main menu (Appearance, then Sign
// out below a divider) that opens a further submenu per row (today: Light/Dark), both built on
// StyledMenu. Ported from the reference app's own UserProfileMenu
// (AccessAndControl.Frontend's Sidebar/UserProfile/UserProfileMenu.tsx); its `mainMenuItems`'
// Appearance row shows the *current* mode as its own label/icon rather than a static caption
// line, same here - StyledMenu's item shape (label/icon, no secondary text) doesn't model that
// second line anyway. Its own Logout row is the same `color: 'error'` + divider-above treatment
// as the reference's.
export function UserProfileMenu({ userDisplay, collapsed, onSignOut, signingOut }: UserProfileMenuProps) {
  const styles = useSidebarStyles({ collapsed })
  const { mode, setMode } = useThemeMode()
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<HTMLElement | null>(null)
  // The Appearance row's own submenu - anchored to that row itself, not the profile row, so it
  // opens beside it rather than back at the top.
  const [appearanceMenuAnchor, setAppearanceMenuAnchor] = useState<HTMLElement | null>(null)

  function closeMenus() {
    setProfileMenuAnchor(null)
    setAppearanceMenuAnchor(null)
  }

  const mainMenuItems: StyledMenuItemConfig[] = [
    {
      label: mode === 'dark' ? 'Dark' : 'Light',
      icon: <PaletteOutlinedIcon fontSize="small" />,
      onClick: (event) => setAppearanceMenuAnchor(event.currentTarget),
      hasSubmenu: true,
      divider: true,
    },
    {
      label: 'Sign out',
      icon: <LogoutOutlinedIcon fontSize="small" />,
      color: 'error',
      disabled: signingOut,
      onClick: () => {
        closeMenus()
        onSignOut()
      },
    },
  ]

  const appearanceMenuItems: StyledMenuItemConfig[] = [
    {
      label: 'Light',
      icon: <LightModeOutlinedIcon fontSize="small" />,
      active: mode === 'light',
      onClick: () => {
        setMode('light')
        closeMenus()
      },
    },
    {
      label: 'Dark',
      icon: <DarkModeOutlinedIcon fontSize="small" />,
      active: mode === 'dark',
      onClick: () => {
        setMode('dark')
        closeMenus()
      },
    },
  ]

  return (
    <>
      <Tooltip
        title={collapsed ? [userDisplay.name, userDisplay.caption].filter(Boolean).join(' — ') : ''}
        placement="right"
      >
        {/* A plain Box with role="button" (not a real <button>) - same element the reference
            app's own CompanySelector/UserProfileMenu triggers use - rather than fighting the
            browser's native button chrome (background/font) inside the navy rail. */}
        <Box
          role="button"
          tabIndex={0}
          onClick={(event) => setProfileMenuAnchor(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setProfileMenuAnchor(event.currentTarget)
            }
          }}
          aria-haspopup="menu"
          aria-expanded={Boolean(profileMenuAnchor)}
          aria-label={[userDisplay.name, userDisplay.caption].filter(Boolean).join(' — ')}
          sx={styles.userRow}
        >
          <Box sx={styles.userAvatar}>{initials(userDisplay.name)}</Box>
          {!collapsed && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" noWrap>
                  {userDisplay.name}
                </Typography>
                {userDisplay.caption && (
                  <Typography variant="caption" noWrap component="p" color="text.secondary">
                    {userDisplay.caption}
                  </Typography>
                )}
              </Box>
              <Box component="span" sx={styles.chevron(Boolean(profileMenuAnchor))}>
                <ExpandMoreOutlinedIcon fontSize="small" />
              </Box>
            </>
          )}
        </Box>
      </Tooltip>

      {/* Main menu - the reference's own account menu is 280 wide, pulled in (ml: -1) to
          overlap the row's own edge. */}
      <StyledMenu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={closeMenus}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        width={280}
        items={mainMenuItems}
        slotProps={{ paper: { sx: { ml: -1 } } }}
      />

      {/* Appearance submenu - same origins as the main menu, but pushed clear of the row it
          opens from (ml: 1) instead of overlapping it. */}
      <StyledMenu
        anchorEl={appearanceMenuAnchor}
        open={Boolean(appearanceMenuAnchor)}
        onClose={() => setAppearanceMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        width={220}
        heading="Appearance"
        items={appearanceMenuItems}
        slotProps={{ paper: { sx: { ml: 1 } } }}
      />
    </>
  )
}
