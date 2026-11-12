import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      // e2e/ holds Playwright specs (npx playwright test), a separate runner/API from Vitest.
      exclude: ['**/node_modules/**', '**/e2e/**'],
    },
  }),
)
