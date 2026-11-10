import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealth } from './health'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the versioned health route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await getHealth()

    // Matcher on the path suffix so a developer's .env.local VITE_API_BASE_URL does not break the test.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/health$/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it("returns 'unavailable' when the request times out", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError')),
    )

    await expect(getHealth()).resolves.toBe('unavailable')
  })

  it("returns 'ok' for 200 with { status: 'ok' }", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' })))

    await expect(getHealth()).resolves.toBe('ok')
  })

  it("returns 'unavailable' for a non-200 response", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }, 503)))

    await expect(getHealth()).resolves.toBe('unavailable')
  })

  it("returns 'unavailable' for 200 with a different body", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'degraded' })))

    await expect(getHealth()).resolves.toBe('unavailable')
  })

  it("returns 'unavailable' for 200 with a non-JSON body", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status: 200 })))

    await expect(getHealth()).resolves.toBe('unavailable')
  })

  it("returns 'unavailable' on a network error", async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getHealth()).resolves.toBe('unavailable')
  })
})
