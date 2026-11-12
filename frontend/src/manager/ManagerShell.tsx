import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Outlet, useNavigate } from 'react-router-dom'
import { ThemeToggleButton } from '../shared/common/Buttons/ThemeToggleButton'
import { signOut } from '../shared/api/superAdminAuth'

// Layout-only root for the Manager/Owner entry point: AppBar plus whichever route is active.
// This is the exclusively-authenticated shell (post Story 1.2's routing fix), so sign-out lives
// here rather than in any individual screen.
export function ManagerShell() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sign-out clears local auth UI state and redirects regardless of whether the server call
    // succeeded — never leaves the UI stuck showing "signed in".
    navigate('/super-admin/sign-in', { replace: true })
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Manager
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggleButton sx={{ color: 'inherit' }} />
            <Button
              color="inherit"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              data-testid="sign-out-button"
            >
              Sign out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  )
}
