import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import { getSession } from '../../../shared/api/ownerAuth'

type SessionStatus = 'pending' | 'valid' | 'invalid' | 'mart-suspended'

// Route guard for /owner: calls getSession() once on mount. While pending, renders a loading
// placeholder (never the protected children, never a redirect) so protected content never
// flashes before the session check settles. Same shape as RequireSession, kept separate because
// Owner and Super Admin are different session types (distinct cookies, distinct sign-in routes -
// /auth/sign-in for Owner, deliberately not /owners/sign-in, so the route itself gives no hint
// that a separate Super Admin sign-in exists).
//
// 'mart-suspended' (Story 1.7/FR-25): a Mart that was active when this Owner signed in can be
// suspended later - refused "on next contact", not just at the next sign-in - so a return visit
// (or this guard's own poll) can find a now-suspended Mart behind an otherwise-valid session.
// Redirected to sign-in the same as any other invalid session, but with enough state for it to
// show the accurate reason instead of silently bouncing back to a bare form.
export function RequireOwnerSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('pending')
  // The backend's own wording for the suspended-Mart case, carried through to the sign-in
  // redirect's state - never hardcoded here.
  const [martSuspendedMessage, setMartSuspendedMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getSession().then((result) => {
      if (!active) {
        return
      }
      if (result.ok) {
        setStatus('valid')
        return
      }
      if (result.reason === 'mart-suspended') {
        setMartSuspendedMessage(result.message)
        setStatus('mart-suspended')
        return
      }
      setStatus('invalid')
    })
    return () => {
      active = false
    }
  }, [])

  if (status === 'pending') {
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

  if (status === 'mart-suspended') {
    return <Navigate to="/auth/sign-in" state={{ martSuspendedMessage }} replace />
  }

  if (status === 'invalid') {
    return <Navigate to="/auth/sign-in" replace />
  }

  return <>{children}</>
}
