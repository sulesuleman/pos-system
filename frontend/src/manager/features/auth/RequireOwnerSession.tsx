import type { ReactNode } from 'react'
import { RequireRoleSession } from './RequireRoleSession'

// Route guard for /owner/*: Owner and Super Admin are different session types (distinct
// cookies, distinct sign-in routes - /auth/sign-in for Owner, deliberately not /owners/sign-in,
// so the route itself gives no hint that a separate Super Admin sign-in exists), so this stays
// its own named guard even though the actual logic is now shared with RequireManagerSession via
// RequireRoleSession.
export function RequireOwnerSession({ children }: { children: ReactNode }) {
  return <RequireRoleSession role="Owner">{children}</RequireRoleSession>
}
