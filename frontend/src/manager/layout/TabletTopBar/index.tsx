import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { Logo } from '../../../shared/common/Brand/Logo'
import { useTabletTopBarStyles } from './useTabletTopBarStyles'

export type TabletTopBarProps = {
  menuOpen: boolean
  onMenu: () => void
}

// The tablet band's own top bar (`tablet` to `lg`, where the permanent rail gives way to a
// drawer) - the app name on the same gradient field the rail itself sits on, and the button that
// opens Sidebar in that drawer. Ported from the reference app's own TabletTopBar
// (AccessAndControl.Frontend's ui/layout/TabletTopBar.tsx); it sits above PageLayout, which
// scrolls under nothing here, unlike the phone's own logo bar (PageLayout draws that one itself).
export function TabletTopBar({ menuOpen, onMenu }: TabletTopBarProps) {
  const styles = useTabletTopBarStyles()

  return (
    <Box component="header" sx={styles.root}>
      <Logo />
      <Typography variant="subtitle1" noWrap sx={styles.title}>
        POS System
      </Typography>
      <IconButton
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        onClick={onMenu}
        sx={styles.menuButton}
      >
        <MenuOutlinedIcon />
      </IconButton>
    </Box>
  )
}
