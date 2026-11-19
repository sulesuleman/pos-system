import type { ReactNode } from 'react'
import { RequireRoleSession } from './RequireRoleSession'

// Route guard for /manager/*: a Manager signs in through the same /auth/* endpoints as the
// Owner (AD-15), so its own session check is the shared RequireRoleSession logic, just reserved
// for the "Manager" Role - a signed-in Owner hitting /manager directly is bounced to sign-in,
// same as any other Role mismatch.
export function RequireManagerSession({ children }: { children: ReactNode }) {
  return <RequireRoleSession role="Manager">{children}</RequireRoleSession>
}
