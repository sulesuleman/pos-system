import { apiFetch } from './client'

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: 'invalid-credentials' | 'error' }

export type SessionResult = { ok: true } | { ok: false }

export type SignOutResult = { ok: true } | { ok: false }

// Calls POST /api/v1/super-admin/sign-in. Sets a session cookie on success.
// Never throws: any failure (network error, 401, unexpected status) maps to a typed result
// with a generic reason — never reveals whether the email exists.
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const response = await apiFetch('/super-admin/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      return { ok: true }
    }
    if (response.status === 401) {
      return { ok: false, reason: 'invalid-credentials' }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/super-admin/sign-out. Clears the session cookie.
// Never throws: callers should clear local auth UI state regardless of the result.
export async function signOut(): Promise<SignOutResult> {
  try {
    const response = await apiFetch('/super-admin/sign-out', {
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

// Calls GET /api/v1/super-admin/session. Used on app load to restore a persisted session
// without re-prompting. Never throws: any failure maps to { ok: false }.
export async function getSession(): Promise<SessionResult> {
  try {
    const response = await apiFetch('/super-admin/session', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      return { ok: true }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}
