import { apiFetch } from './client'

export type HealthStatus = 'ok' | 'unavailable'

// Calls GET /api/v1/health. Any failure (network error, non-200, unexpected body) maps to 'unavailable'.
export async function getHealth(): Promise<HealthStatus> {
  try {
    const response = await apiFetch('/health', { signal: AbortSignal.timeout(5000) })
    if (response.status !== 200) {
      return 'unavailable'
    }
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      (body as { status?: unknown }).status === 'ok'
    ) {
      return 'ok'
    }
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}
