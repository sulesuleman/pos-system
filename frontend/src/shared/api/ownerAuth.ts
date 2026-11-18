import { apiFetch } from './client'

export type OwnerSessionInfo = {
  userId: string
  martId: string
  martName: string
  firstName: string
  lastName: string
  role: string
}

export type ActivateOwnerResult =
  | { ok: true }
  | { ok: false; reason: 'weak-password'; message: string }
  | { ok: false; reason: 'invalid' | 'error' }

export type SignInOwnerResult =
  | { ok: true; owner: OwnerSessionInfo }
  | { ok: false; reason: 'invalid-credentials' | 'error' }

export type OwnerSessionResult = { ok: true; owner: OwnerSessionInfo } | { ok: false }

export type OwnerSignOutResult = { ok: true } | { ok: false }

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
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/auth/sign-in. Sets a session cookie on success.
// Never throws: any failure (network error, 401, unexpected status/body) maps to a typed result
// with a generic reason - never reveals which part of the Mart code/email/password was wrong.
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
// round-trip. Never throws: any failure maps to { ok: false }.
export async function getSession(): Promise<OwnerSessionResult> {
  try {
    const response = await apiFetch('/auth/session', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!isOwnerSessionInfo(body)) {
      return { ok: false }
    }
    return { ok: true, owner: body }
  } catch {
    return { ok: false }
  }
}
