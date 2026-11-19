import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import { getSession } from '../../../shared/api/ownerAuth'

type SessionStatus = 'pending' | 'valid' | 'invalid' | 'mart-suspended'

export type RequireRoleSessionProps = {
  // The exact Role name (as returned in getSession()'s `role` field, e.g. "Owner"/"Manager")
  // this route is reserved for. A valid session signed in as any other Role is treated the same
  // as no session at all - redirected to sign-in, not silently shown this route's content, and
  // not auto-redirected to their own correct area (keeps this guard simple; a Manager hitting
  // /owner by hand is already an edge case).
  role: string
  children: ReactNode
}

// Shared route-guard logic behind RequireOwnerSession/RequireManagerSession: calls getSession()
// once on mount. While pending, renders a loading placeholder (never the protected children,
// never a redirect) so protected content never flashes before the session check settles. Owner
// and Manager share this one implementation (both sign in through the same /auth/* endpoints,
// AD-15/Epic 2) parameterized by `role`, rather than two near-identical ~70-line files - same
// discipline the backend side applied to its own test-fixture duplication.
//
// 'mart-suspended' (Story 1.7/FR-25): a Mart that was active when this User signed in can be
// suspended later - refused "on next contact", not just at the next sign-in - so a return visit
// (or this guard's own poll) can find a now-suspended Mart behind an otherwise-valid session.
// Redirected to sign-in the same as any other invalid session, but with enough state for it to
// show the accurate reason instead of silently bouncing back to a bare form.
export function RequireRoleSession({ role, children }: RequireRoleSessionProps) {
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
        setStatus(result.owner.role === role ? 'valid' : 'invalid')
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
  }, [role])

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
