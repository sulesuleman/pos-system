import { apiFetch } from './client'

export type Branch = {
  id: string
  name: string
  location: string
  timeZone: string
  isActive: boolean
}

export type ListBranchesResult = { ok: true; branches: Branch[] } | { ok: false }

export type CreateBranchInput = {
  name: string
  location: string
  timeZone: string
}

export type CreateBranchFieldErrors = {
  name?: string
  location?: string
  timeZone?: string
}

export type CreateBranchResult =
  | { ok: true; branch: Branch }
  | { ok: false; reason: 'validation'; errors: CreateBranchFieldErrors }
  | { ok: false; reason: 'error' }

export type UpdateBranchInput = {
  name: string
  location: string
  timeZone: string
}

export type UpdateBranchResult =
  | { ok: true; branch: Branch }
  | { ok: false; reason: 'validation'; errors: CreateBranchFieldErrors }
  | { ok: false; reason: 'error' }

export type DeactivateBranchResult = { ok: true } | { ok: false }

function isBranch(value: unknown): value is Branch {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.location === 'string' &&
    typeof candidate.timeZone === 'string' &&
    typeof candidate.isActive === 'boolean'
  )
}

// Calls GET /api/v1/branches. Owner sees every Branch in their Mart; a Branch-scoped user (once
// that exists, Epic 2's later stories) sees only their own. Never throws: any failure maps to
// { ok: false }.
export async function listBranches(): Promise<ListBranchesResult> {
  try {
    const response = await apiFetch('/branches', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body) || !body.every(isBranch)) {
      return { ok: false }
    }
    return { ok: true, branches: body }
  } catch {
    return { ok: false }
  }
}

// Calls POST /api/v1/branches (Owner-only). Never throws: any failure maps to a typed result -
// per-field validation messages on 400, a generic error reason on anything else.
export async function createBranch(input: CreateBranchInput): Promise<CreateBranchResult> {
  try {
    const response = await apiFetch('/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 201) {
      const body: unknown = await response.json()
      if (!isBranch(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, branch: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: CreateBranchFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls PUT /api/v1/branches/{id}. Owner may edit any Branch; a Branch-scoped user with
// "manage Branches and devices" may edit only their own (enforced server-side).
export async function updateBranch(id: string, input: UpdateBranchInput): Promise<UpdateBranchResult> {
  try {
    const response = await apiFetch(`/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      const body: unknown = await response.json()
      if (!isBranch(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, branch: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: CreateBranchFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls POST /api/v1/branches/{id}/deactivate (Owner-only). One-way - no reactivate endpoint
// exists yet (not specified by FR-26/epics; raise with the product owner if one's needed).
export async function deactivateBranch(id: string): Promise<DeactivateBranchResult> {
  try {
    const response = await apiFetch(`/branches/${id}/deactivate`, {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    return response.status === 200 ? { ok: true } : { ok: false }
  } catch {
    return { ok: false }
  }
}
