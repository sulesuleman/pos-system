import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import { getSession } from '../../../shared/api/superAdminAuth'

type SessionStatus = 'pending' | 'valid' | 'invalid'

// Route guard for /super-admin: calls getSession() once on mount. While pending, renders a
// loading placeholder (never the protected children, never a redirect) so protected content
// never flashes before the session check settles.
export function RequireSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('pending')

  useEffect(() => {
    let active = true
    void getSession().then((result) => {
      if (active) {
        setStatus(result.ok ? 'valid' : 'invalid')
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (status === 'pending') {
    // RequireSession wraps arbitrary children, so it has no specific content shape to mirror -
    // a generic block skeleton stands in for "some content is about to appear here".
    return (
      <Container sx={{ py: 3 }}>
        <Box role="status" aria-label="Loading">
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={40} width="30%" />
        </Box>
      </Container>
    )
  }

  if (status === 'invalid') {
    return <Navigate to="/super-admin/sign-in" replace />
  }

  return <>{children}</>
}
