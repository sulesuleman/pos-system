import { apiFetch } from './client'

export type MartSettings = {
  currency: string
  defaultTimeZone: string
  longPendingReturnMinutes: number
}

export type GetMartSettingsResult = { ok: true; settings: MartSettings } | { ok: false }

export type MartSettingsFieldErrors = {
  currency?: string
  defaultTimeZone?: string
  longPendingReturnMinutes?: string
}

export type UpdateMartSettingsResult =
  | { ok: true; settings: MartSettings }
  | { ok: false; reason: 'validation'; errors: MartSettingsFieldErrors }
  | { ok: false; reason: 'error' }

function isMartSettings(value: unknown): value is MartSettings {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.currency === 'string' &&
    typeof candidate.defaultTimeZone === 'string' &&
    typeof candidate.longPendingReturnMinutes === 'number'
  )
}

// Calls GET /api/v1/mart-settings (Owner-only). Never throws: any failure maps to { ok: false }.
export async function getMartSettings(): Promise<GetMartSettingsResult> {
  try {
    const response = await apiFetch('/mart-settings', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    })
    if (response.status !== 200) {
      return { ok: false }
    }
    const body: unknown = await response.json()
    if (!isMartSettings(body)) {
      return { ok: false }
    }
    return { ok: true, settings: body }
  } catch {
    return { ok: false }
  }
}

// Calls PUT /api/v1/mart-settings (Owner-only). Never throws: any failure maps to a typed result.
export async function updateMartSettings(input: MartSettings): Promise<UpdateMartSettingsResult> {
  try {
    const response = await apiFetch('/mart-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 200) {
      const body: unknown = await response.json()
      if (!isMartSettings(body)) {
        return { ok: false, reason: 'error' }
      }
      return { ok: true, settings: body }
    }
    if (response.status === 400) {
      const body = (await response.json()) as { errors?: MartSettingsFieldErrors }
      return { ok: false, reason: 'validation', errors: body.errors ?? {} }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
