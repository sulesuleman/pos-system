import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { ThemeToggleButton } from '../shared/common/Buttons/ThemeToggleButton'

// Layout-only root for the Manager/Owner entry point: AppBar plus whichever route is active.
export function ManagerShell() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Manager
          </Typography>
          <Box>
            <ThemeToggleButton sx={{ color: 'inherit' }} />
          </Box>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  )
}
