import { apiFetch } from './client'

export type Permission = {
  id: string
  name: string
}

export type ListPermissionsResult = { ok: true; permissions: Permission[] } | { ok: false }

export type Role = {
  id: string
  name: string
  isSystemDefault: boolean
  permissionIds: string[]
}

export type ListRolesResult = { ok: true; roles: Role[] } | { ok: false }

export type RoleInput = {
  name: string
  permissionIds: string[]
}

export type RoleFieldErrors = {
  name?: string
  permissionIds?: string
}

export type CreateRoleResult =
  | { ok: true; role: Role }
  | { ok: false; reason: 'validation'; errors: RoleFieldErrors }
  | { ok: false; reason: 'error' }

// Editing a built-in Role (Manager/Cashier) forks a new Mart-scoped Role server-side rather than
// mutating the globally-shared row - the returned Role's `id` is the fork's, not the one in the
// URL. Callers should treat the response as "the Role to show/select now", not assume its id
// matches the one just edited.
export type UpdateRoleResult =
  | { ok: true; role: Role }
  | { ok: false; reason: 'validation'; errors: RoleFieldErrors }
  | { ok: false; reason: 'error' }

function isPermission(value: unknown): value is Permission {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && typeof candidate.name === 'string'
}

function isRole(value: unknown): value is Role {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.isSystemDefault === 'boolean' &&
    Array.isArray(candidate.permissionIds) &&
    candidate.permissionIds.every((id) => typeof id === 'string')
  )
}

// Calls GET /api/v1/permissions - the fixed 14-Permission list (PRD FR-1), never Mart-specific.
// Never throws: any failure maps to { ok: false }.
export async function listPermissions(): Promise<ListPermissionsResult> {
  try {
    const response = await apiFetch('/permissions', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body) || !body.every(isPermission)) {
      return { ok: false }
    }
    return { ok: true, permissions: body }
  } catch {
    return { ok: false }
  }
}

// Calls GET /api/v1/roles - this Mart's own custom Roles plus the 3 globally-shared built-in
// ones (Owner/Manager/Cashier). Never throws: any failure maps to { ok: false }.
export async function listRoles(): Promise<ListRolesResult> {
  try {
    const response = await apiFetch('/roles', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body) || !body.every(isRole)) {
      return { ok: false }
    }
    return { ok: true, roles: body }
  } catch {
    return { ok: false }
  }
}

// Calls POST /api/v1/roles - creates a custom Role scoped to the signed-in Owner's Mart. Never
// throws: any failure maps to a typed result - per-field validation messages on 400, a generic
// error reason on anything else.
export async function createRole(input: RoleInput): Promise<CreateRoleResult> {
  try {
    const response = await apiFetch('/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 201) {
      const body: unknown = await response.json()
      if (!isRole(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, role: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: RoleFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Calls PUT /api/v1/roles/{id}. Editing a built-in Role forks a new Mart-scoped copy server-side
// instead of mutating the globally-shared row - see UpdateRoleResult's note on the returned id.
export async function updateRole(id: string, input: RoleInput): Promise<UpdateRoleResult> {
  try {
    const response = await apiFetch(`/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      const body: unknown = await response.json()
      if (!isRole(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, role: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: RoleFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
