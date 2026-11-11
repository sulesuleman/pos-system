import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// globals: false means Testing Library cannot auto-register cleanup; do it explicitly.
afterEach(() => {
  cleanup()
})

// jsdom does not implement matchMedia. The theme's prefers-color-scheme default and its
// live-update listener both call it, so stub a inert implementation for every test.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
