import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMart, listMarts, type CreateMartInput } from './marts'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function validInput(overrides: Partial<CreateMartInput> = {}): CreateMartInput {
  return {
    martName: 'Mart A',
    ownerFirstName: 'Ayesha',
    ownerLastName: 'Khan',
    ownerEmail: 'ayesha@example.com',
    ownerContact: '+923001234567',
    ownerCnic: '12345-1234567-1',
    ...overrides,
  }
}

describe('listMarts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned marts route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await listMarts()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/marts$/),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns the list of Marts on 200', async () => {
    const marts = [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, marts)))

    await expect(listMarts()).resolves.toEqual({ ok: true, marts })
  })

  it('returns not-ok on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500)))

    await expect(listMarts()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok on a network failure, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(listMarts()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok when the body is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { not: 'an array' })))

    await expect(listMarts()).resolves.toEqual({ ok: false })
  })
})

describe('createMart', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned marts route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(201, { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'XYZ' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createMart(validInput())

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/marts$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns the created Mart on 201', async () => {
    const mart = { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'XYZ' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, mart)))

    await expect(createMart(validInput())).resolves.toEqual({ ok: true, mart })
  })

  it('returns per-field validation errors on 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(400, { errors: { martName: 'Mart name is required.' } })),
    )

    await expect(createMart(validInput({ martName: '' }))).resolves.toEqual({
      ok: false,
      reason: 'validation',
      errors: { martName: 'Mart name is required.' },
    })
  })

  it('returns error on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500)))

    await expect(createMart(validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })

  it('returns error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createMart(validInput())).resolves.toEqual({ ok: false, reason: 'error' })
  })
})
