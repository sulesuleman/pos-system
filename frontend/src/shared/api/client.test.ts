import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadClient(baseUrl: string) {
  vi.stubEnv('VITE_API_BASE_URL', baseUrl)
  vi.resetModules()
  return import('./client')
}

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefixes a non-empty base URL for both leading-slash and bare paths', async () => {
    const { apiUrl } = await loadClient('https://api.example.com')

    expect(apiUrl('/health')).toBe('https://api.example.com/api/v1/health')
    expect(apiUrl('health')).toBe('https://api.example.com/api/v1/health')
  })

  it('strips trailing slashes from the base URL', async () => {
    const { apiUrl } = await loadClient('https://api.example.com/')

    expect(apiUrl('/health')).toBe('https://api.example.com/api/v1/health')
    expect(apiUrl('health')).toBe('https://api.example.com/api/v1/health')
  })

  it('uses a same-origin path when the base URL is empty', async () => {
    const { apiUrl } = await loadClient('')

    expect(apiUrl('/health')).toBe('/api/v1/health')
    expect(apiUrl('health')).toBe('/api/v1/health')
  })
})
