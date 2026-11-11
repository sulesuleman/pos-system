import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSession, signIn, signOut } from './superAdminAuth'

function response(status: number): Response {
  return new Response(null, { status })
}

describe('signIn', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned sign-in route with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200))
    vi.stubGlobal('fetch', fetchMock)

    await signIn('owner@example.com', 'secret')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/super-admin\/sign-in$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('returns ok on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200)))

    await expect(signIn('a@b.com', 'x')).resolves.toEqual({ ok: true })
  })

  it('returns invalid-credentials on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(signIn('a@b.com', 'x')).resolves.toEqual({
      ok: false,
      reason: 'invalid-credentials',
    })
  })

  it('returns error on an unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500)))

    await expect(signIn('a@b.com', 'x')).resolves.toEqual({ ok: false, reason: 'error' })
  })

  it('returns error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(signIn('a@b.com', 'x')).resolves.toEqual({ ok: false, reason: 'error' })
  })
})

describe('signOut', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(204)))

    await expect(signOut()).resolves.toEqual({ ok: true })
  })

  it('returns not-ok on a network failure, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(signOut()).resolves.toEqual({ ok: false })
  })
})

describe('getSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200)))

    await expect(getSession()).resolves.toEqual({ ok: true })
  })

  it('returns not-ok on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))

    await expect(getSession()).resolves.toEqual({ ok: false })
  })

  it('returns not-ok on a network failure, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getSession()).resolves.toEqual({ ok: false })
  })
})
