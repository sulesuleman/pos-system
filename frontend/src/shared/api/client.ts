// Base URL for the backend API. Empty string means same origin (the Vite dev proxy forwards /api).
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

// All API routes are versioned under /api/v1.
export const API_V1 = '/api/v1'

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${API_V1}${normalized}`
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}
