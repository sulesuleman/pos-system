import { apiFetch } from './client'

export type StaffMember = {
  id: string
  staffId: string
  firstName: string
  lastName: string
  email: string | null
  role: string
  active: boolean
  branchId: string | null
  branchName: string | null
}

export type ListStaffResult = { ok: true; staff: StaffMember[] } | { ok: false }

export type CreateStaffInput = {
  firstName: string
  lastName: string
  email: string
  contact: string
  cnic: string
  roleId: string
  // Required when the signed-in creator is the Owner (not Branch-scoped) - the backend assigns
  // a Branch-scoped creator's own BranchId automatically and ignores this field for them.
  branchId?: string
}

export type CreateStaffFieldErrors = {
  firstName?: string
  lastName?: string
  email?: string
  contact?: string
  cnic?: string
  roleId?: string
  branchId?: string
}

export type CreateStaffSuccess = {
  userId: string
  staffId: string
  setupCode: string
}

export type CreateStaffResult =
  | { ok: true; staff: CreateStaffSuccess }
  | { ok: false; reason: 'validation'; errors: CreateStaffFieldErrors }
  | { ok: false; reason: 'error' }

function isStaffMember(value: unknown): value is StaffMember {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.staffId === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.lastName === 'string' &&
    (candidate.email === null || typeof candidate.email === 'string') &&
    typeof candidate.role === 'string' &&
    typeof candidate.active === 'boolean' &&
    (candidate.branchId === null || typeof candidate.branchId === 'string') &&
    (candidate.branchName === null || typeof candidate.branchName === 'string')
  )
}

function isCreateStaffSuccess(value: unknown): value is CreateStaffSuccess {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.staffId === 'string' &&
    typeof candidate.setupCode === 'string'
  )
}

// Calls GET /api/v1/staff. Owner sees every Manager in their Mart (plus their own row); a
// Branch-scoped user holding "manage staff and Roles" sees the same - the server, not this
// client, decides the actual scope. Never throws: any failure maps to { ok: false }.
export async function listStaff(): Promise<ListStaffResult> {
  try {
    const response = await apiFetch('/staff', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body) || !body.every(isStaffMember)) {
      return { ok: false }
    }
    return { ok: true, staff: body }
  } catch {
    return { ok: false }
  }
}

// Calls POST /api/v1/staff - requires "manage staff and Roles" (Owner always passes). Never
// throws: any failure maps to a typed result - per-field validation messages on 400, a generic
// error reason on anything else.
export async function createStaff(input: CreateStaffInput): Promise<CreateStaffResult> {
  try {
    const response = await apiFetch('/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 201) {
      const body: unknown = await response.json()
      if (!isCreateStaffSuccess(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, staff: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: CreateStaffFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
