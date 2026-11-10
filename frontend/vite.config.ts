import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Two HTML entry points in one codebase: Manager/Owner (index.html) and Counter (counter.html).
// `base` is left at the default '/'; Electron packaging of the Counter is deferred to Epic 4.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/': 'http://localhost:5000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        manager: fileURLToPath(new URL('./index.html', import.meta.url)),
        counter: fileURLToPath(new URL('./counter.html', import.meta.url)),
      },
    },
  },
})
