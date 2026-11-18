// Base URL for the backend API. Empty string means same origin (the Vite dev proxy forwards /api).
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

// All API routes are versioned under /api/v1.
export const API_V1 = '/api/v1'

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${API_V1}${normalized}`
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  // 'include' is required for the session cookie to be sent/stored whenever a call crosses
  // origins (e.g. hitting the backend host directly instead of through the Vite dev proxy) -
  // without it, the browser silently drops Set-Cookie on the response and never sends the
  // cookie back, so sign-in succeeds but every following request looks signed-out.
  return fetch(apiUrl(path), { credentials: 'include', ...init })
}
