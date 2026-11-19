import { apiFetch } from './client'

export type OwnerSessionInfo = {
  userId: string
  martId: string
  martName: string
  firstName: string
  lastName: string
  role: string
}

// 'mart-suspended' (Story 1.7/FR-25): the Mart itself, not the credentials, is why this was
// refused - kept distinct from 'invalid'/'invalid-credentials' so the UI can show an accurate
// message instead of implying a typo in the Mart code/email/password/setup code. Its `message`
// is the backend's own wording (AuthEndpoints.cs's MartSuspendedResult/Program.cs's
// suspension-check middleware) - this file never hardcodes that sentence, so there's exactly one
// place (the backend) that owns it.
export type ActivateOwnerResult =
  | { ok: true }
  | { ok: false; reason: 'weak-password'; message: string }
  | { ok: false; reason: 'mart-suspended'; message: string }
  | { ok: false; reason: 'invalid' | 'error' }

export type SignInOwnerResult =
  | { ok: true; owner: OwnerSessionInfo }
  | { ok: false; reason: 'mart-suspended'; message: string }
  | { ok: false; reason: 'invalid-credentials' | 'error' }

export type OwnerSessionResult =
  | { ok: true; owner: OwnerSessionInfo }
  | { ok: false; reason: 'mart-suspended'; message: string }
  | { ok: false; reason: 'error' }

export type OwnerSignOutResult = { ok: true } | { ok: false }

// A 403 from these endpoints means the Mart is suspended - the one status code none of them use
// for anything else (401 is an invalid session/credentials, 400 is a validation failure, 200 is
// success). Returns the backend's own message rather than asserting its exact text, so this
// file stays correct even if that wording changes without a frontend update.
async function readMartSuspendedMessage(response: Response): Promise<string | null> {
  if (response.status !== 403) {
    return null
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return typeof body?.error === 'string' ? body.error : null
}

function isOwnerSessionInfo(value: unknown): value is OwnerSessionInfo {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.martId === 'string' &&
    typeof candidate.martName === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.lastName === 'string' &&
    typeof candidate.role === 'string'
  )
}

// Calls POST /api/v1/auth/activate. Never throws: any failure maps to a typed result.
// The backend returns one specific message for a failed password-complexity check and a single
// generic message for every other rejection (unknown Mart/email, used/expired setup code) - that
// generic message never reveals which part of the triple was wrong, so it surfaces as a banner,
// not a per-field error.
export async function activate(
  martCode: string,
  email: string,
  setupCode: string,
  password: string,
): Promise<ActivateOwnerResult> {
  try {
    const response = await apiFetch('/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ martCode, email, setupCode, password }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      return { ok: true }
    }
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (typeof body?.error === 'string' && body.error.startsWith('Password must be')) {
        return { ok: false, reason: 'weak-password', message: body.error }
      }
      return { ok: false, reason: 'invalid' }
    }
    const suspendedMessage = await readMartSuspendedMessage(response)
    if (suspendedMessage !== null) {
      return { ok: false, reason: 'mart-suspended', message: suspendedMessage }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/auth/sign-in. Sets a session cookie on success.
// Never throws: any failure (network error, 401, unexpected status/body) maps to a typed result
// with a generic reason - never reveals which part of the Mart code/email/password was wrong.
// 'mart-suspended' is the one exception: the Mart itself, not the credentials, is why this was
// refused, so it's safe (and more accurate) to say so (Story 1.7/FR-25).
export async function signIn(martCode: string, email: string, password: string): Promise<SignInOwnerResult> {
  try {
    const response = await apiFetch('/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ martCode, email, password }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      const body: unknown = await response.json()
      if (!isOwnerSessionInfo(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, owner: body }
    }
    if (response.status === 401) {
      return { ok: false, reason: 'invalid-credentials' }
    }
    const suspendedMessage = await readMartSuspendedMessage(response)
    if (suspendedMessage !== null) {
      return { ok: false, reason: 'mart-suspended', message: suspendedMessage }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/auth/sign-out. Clears the session cookie.
// Never throws: callers should clear local auth UI state regardless of the result.
export async function signOut(): Promise<OwnerSignOutResult> {
  try {
    const response = await apiFetch('/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 204) {
      return { ok: true }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

// Calls GET /api/v1/auth/session. Used on app load / page refresh to restore a persisted
// session without re-prompting, and to get the Owner/Mart display fields back without a second
// round-trip. Never throws: any failure maps to a typed result - 'mart-suspended' when a Mart
// that was active at sign-in gets suspended mid-session (Story 1.7/FR-25: refused "on next
// contact", not just at the next sign-in), so callers can show that instead of a silent bounce
// back to the sign-in screen.
export async function getSession(): Promise<OwnerSessionResult> {
  try {
    const response = await apiFetch('/auth/session', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      const suspendedMessage = await readMartSuspendedMessage(response)
      if (suspendedMessage !== null) {
        return { ok: false, reason: 'mart-suspended', message: suspendedMessage }
      }
      return { ok: false, reason: 'error' }
    }
    const body: unknown = await response.json()
    if (!isOwnerSessionInfo(body)) {
      return { ok: false, reason: 'error' }
    }
    return { ok: true, owner: body }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
