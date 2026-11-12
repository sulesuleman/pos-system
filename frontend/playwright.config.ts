import { defineConfig } from '@playwright/test'

// E2E config for live checks against the real backend (not mocks). Expects both
// `npm run dev` (frontend, port 5173) and the backend (`dotnet run`, port 5139) to already
// be running — this does not start either server itself, since the backend half of auth
// requires real seeded/test data that only the backend process can own.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
})
