import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStaff, disableStaff, listStaff, resetStaffCredentials, type CreateStaffInput } from './staff'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function validInput(overrides: Partial<CreateStaffInput> = {}): CreateStaffInput {
  return {
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'ayesha@example.com',
    contact: '+923001234567',
    cnic: '12345-1234567-1',
    roleId: 'role-1',
    branchId: 'branch-1',
    ...overrides,
  }
}

const STAFF_MEMBER = {
  id: '1',
  staffId: '1001',
  firstName: 'Ayesha',
  lastName: 'Khan',
  email: 'ayesha@example.com',
  role: 'Manager',
  activated: true,
  isActive: true,
  branchId: 'branch-1',
  branchName: 'Main Branch',
}

describe('listStaff', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned staff route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await listStaff()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/staff$/),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns the list of staff on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [STAFF_MEMBER])))

    await expect(listStaff()).resolves.toEqual({ ok: true, staff: [STAFF_MEMBER] })
  })

  it('returns a staff member with a null email/branch (Counter-role shape)', async () => {
    const counterStaff = { ...STAFF_MEMBER, email: null, branchName: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [counterStaff])))

    await expect(listStaff()).resolves.toEqual({ ok: true, staff: [counterStaff] })
  })

  it('returns not-ok on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(listStaff()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok on a network failure, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(listStaff()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok when the body is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { not: 'an array' })))

    await expect(listStaff()).resolves.toEqual({ ok: false })
  })
})

describe('createStaff', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned staff route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, { userId: '1', staffId: '1001', setupCode: 'XYZ' }))
    vi.stubGlobal('fetch', fetchMock)

    await createStaff(validInput())

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/staff$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns the created staff member on 201', async () => {
    const staff = { userId: '1', staffId: '1001', setupCode: 'XYZ' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, staff)))

    await expect(createStaff(validInput())).resolves.toEqual({ ok: true, staff })
  })

  it('returns per-field validation errors on 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(400, { errors: { branchId: 'Select a Branch.' } })))

    await expect(createStaff(validInput({ branchId: undefined }))).resolves.toEqual({
      ok: false,
      reason: 'validation',
      errors: { branchId: 'Select a Branch.' },
    })
  })

  it('returns error on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(createStaff(validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })

  it('returns error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createStaff(validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })
})

describe('disableStaff', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the disable route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200))
    vi.stubGlobal('fetch', fetchMock)

    await disableStaff('1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/staff\/1\/disable$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns ok on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200)))

    await expect(disableStaff('1')).resolves.toEqual({ ok: true })
  })

  it('returns a conflict reason on 400 (already disabled)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(400)))

    await expect(disableStaff('1')).resolves.toEqual({ ok: false, reason: 'conflict' })
  })

  it('returns an unauthorized reason on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(disableStaff('1')).resolves.toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('returns error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(disableStaff('1')).resolves.toEqual({ ok: false, reason: 'error' })
  })
})

describe('resetStaffCredentials', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the reset-credentials route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { setupCode: 'XYZ' }))
    vi.stubGlobal('fetch', fetchMock)

    await resetStaffCredentials('1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/staff\/1\/reset-credentials$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns the new setup code on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { setupCode: 'XYZ' })))

    await expect(resetStaffCredentials('1')).resolves.toEqual({ ok: true, setupCode: 'XYZ' })
  })

  it('returns an unauthorized reason on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(resetStaffCredentials('1')).resolves.toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('returns error when the body has no setupCode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {})))

    await expect(resetStaffCredentials('1')).resolves.toEqual({ ok: false, reason: 'error' })
  })

  it('returns error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(resetStaffCredentials('1')).resolves.toEqual({ ok: false, reason: 'error' })
  })
})
