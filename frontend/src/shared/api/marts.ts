import { apiFetch } from './client'

export type MartStatus = 'active' | 'suspended'

export type Mart = {
  id: string
  name: string
  code: string
  status: MartStatus
}

export type ListMartsResult = { ok: true; marts: Mart[] } | { ok: false }

export type CreateMartInput = {
  martName: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerContact: string
  ownerCnic: string
}

export type CreateMartFieldErrors = {
  martName?: string
  ownerFirstName?: string
  ownerLastName?: string
  ownerEmail?: string
  ownerContact?: string
  ownerCnic?: string
}

export type CreateMartSuccess = {
  martId: string
  martCode: string
  ownerStaffId: string
  setupCode: string
}

export type CreateMartResult =
  | { ok: true; mart: CreateMartSuccess }
  | { ok: false; reason: 'validation'; errors: CreateMartFieldErrors }
  | { ok: false; reason: 'error' }

// Suspend/reactivate (Story 1.7, FR-25) both return the same shape as a GetMarts list item, or a
// 400 when the Mart is already in the requested status (e.g. a second Suspend click after the
// list has gone stale) — surfaced as its own reason rather than lumped into 'error', so the
// caller can show "already suspended/active" instead of a generic failure message.
export type MutateMartResult = { ok: true; mart: Mart } | { ok: false; reason: 'conflict' | 'error' }

function isMart(value: unknown): value is Mart {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.code === 'string' &&
    (candidate.status === 'active' || candidate.status === 'suspended')
  )
}

function isCreateMartSuccess(value: unknown): value is CreateMartSuccess {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.martId === 'string' &&
    typeof candidate.martCode === 'string' &&
    typeof candidate.ownerStaffId === 'string' &&
    typeof candidate.setupCode === 'string'
  )
}

// Calls GET /api/v1/marts. Never throws: any failure (network error, non-200, unexpected or
// malformed body) maps to { ok: false }.
export async function listMarts(): Promise<ListMartsResult> {
  try {
    const response = await apiFetch('/marts', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body) || !body.every(isMart)) {
      return { ok: false }
    }
    return { ok: true, marts: body }
  } catch {
    return { ok: false }
  }
}

// Calls POST /api/v1/marts. Never throws: any failure maps to a typed result — per-field
// validation messages on 400, a generic error reason on anything else.
export async function createMart(input: CreateMartInput): Promise<CreateMartResult> {
  try {
    const response = await apiFetch('/marts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 201) {
      const body: unknown = await response.json()
      if (!isCreateMartSuccess(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, mart: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: CreateMartFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/marts/{id}/suspend. 404 (unknown Mart) and 403/401 (not a Super Admin
// session) both map to the generic 'error' reason — this screen only ever acts on a Mart it just
// listed from the same session, so neither is expected in practice.
export async function suspendMart(martId: string): Promise<MutateMartResult> {
  return mutateMartStatus(martId, 'suspend')
}

// Calls POST /api/v1/marts/{id}/reactivate — same contract as suspendMart.
export async function reactivateMart(martId: string): Promise<MutateMartResult> {
  return mutateMartStatus(martId, 'reactivate')
}

async function mutateMartStatus(martId: string, action: 'suspend' | 'reactivate'): Promise<MutateMartResult> {
  try {
    const response = await apiFetch(`/marts/${martId}/${action}`, {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      const body: unknown = await response.json()
      if (!isMart(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, mart: body }
    }
    if (response.status === 400) {
      return { ok: false, reason: 'conflict' }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
