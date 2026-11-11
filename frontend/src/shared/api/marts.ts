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
