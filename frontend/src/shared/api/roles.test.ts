import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRole, listPermissions, listRoles, updateRole, type RoleInput } from './roles'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function validInput(overrides: Partial<RoleInput> = {}): RoleInput {
  return {
    name: 'Shift Lead',
    permissionIds: ['perm-1'],
    ...overrides,
  }
}

const ROLE = {
  id: 'role-1',
  name: 'Manager',
  isSystemDefault: true,
  permissionIds: ['perm-1', 'perm-2'],
}

describe('listPermissions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned permissions route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await listPermissions()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/permissions$/),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns the list of permissions on 200', async () => {
    const permission = { id: 'perm-1', name: 'sell' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [permission])))

    await expect(listPermissions()).resolves.toEqual({ ok: true, permissions: [permission] })
  })

  it('returns not-ok on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(listPermissions()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok on a network failure, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(listPermissions()).resolves.toEqual({ ok: false })
  })
})

describe('listRoles', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the list of Roles on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [ROLE])))

    await expect(listRoles()).resolves.toEqual({ ok: true, roles: [ROLE] })
  })

  it('returns not-ok when the body is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { not: 'an array' })))

    await expect(listRoles()).resolves.toEqual({ ok: false })
  })
})

describe('createRole', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned roles route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, ROLE))
    vi.stubGlobal('fetch', fetchMock)

    await createRole(validInput())

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/roles$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns the created Role on 201', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, ROLE)))

    await expect(createRole(validInput())).resolves.toEqual({ ok: true, role: ROLE })
  })

  it('returns per-field validation errors on 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(400, { errors: { name: 'A Role with this name already exists in this Mart.' } })))

    await expect(createRole(validInput())).resolves.toEqual({
      ok: false,
      reason: 'validation',
      errors: { name: 'A Role with this name already exists in this Mart.' },
    })
  })

  it('returns error on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(createRole(validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })
})

describe('updateRole', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls PUT on the versioned roles route with the given id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, ROLE))
    vi.stubGlobal('fetch', fetchMock)

    await updateRole('role-1', validInput())

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/roles\/role-1$/),
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
  })

  it('returns the updated (possibly forked) Role on 200', async () => {
    const forked = { ...ROLE, id: 'role-2', isSystemDefault: false }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, forked)))

    await expect(updateRole('role-1', validInput())).resolves.toEqual({ ok: true, role: forked })
  })

  it('returns per-field validation errors on 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(400, { errors: { permissionIds: 'Select at least one Permission.' } })))

    await expect(updateRole('role-1', validInput())).resolves.toEqual({
      ok: false,
      reason: 'validation',
      errors: { permissionIds: 'Select at least one Permission.' },
    })
  })

  it('returns error on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(updateRole('role-1', validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })
})
