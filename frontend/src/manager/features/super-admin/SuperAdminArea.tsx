import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { getHealth, type HealthStatus } from '../../../shared/api/health'
// Sign-out lives in the auth feature (it owns sign-in/sign-out/session); this is the one
// deliberate cross-feature reach in this screen, since signing out is only reachable from here.
import { signOut } from '../../../shared/api/superAdminAuth'

// Minimal placeholder landing for the Super Admin area until Story 1.3 adds the Marts list.
export function SuperAdminArea() {
  const navigate = useNavigate()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    void getHealth().then((status) => {
      if (active) {
        setHealth(status)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sign-out clears local auth UI state and redirects regardless of whether the server
    // call succeeded — never leaves the UI stuck showing "signed in".
    navigate('/super-admin/sign-in', { replace: true })
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Super Admin
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <Typography role="status">
          {health === null ? 'API: checking…' : `API: ${health}`}
        </Typography>
        <Button variant="outlined" onClick={() => void handleSignOut()} disabled={signingOut}>
          Sign out
        </Button>
      </Box>
    </Container>
  )
}
