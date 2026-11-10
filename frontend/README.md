# POS System — Frontend

One React codebase with two entry points: the **Manager/Owner** web app and the **Counter** app.
The API lives in the separate **backend** repository.

## Prerequisites

- Node.js 24 (npm 11)
- Git

## Commands

```sh
npm ci              # install exact locked dependencies
npm run dev         # dev server; Manager at /, Counter at /counter.html
npm run lint        # ESLint
npm run typecheck   # TypeScript (strict)
npm test            # Vitest (single run)
npm run build       # production build to dist/ (index.html + counter.html)
```

In development, requests to `/api` are proxied to `http://localhost:5000`, the backend's dev URL.
To point the app at a different API, copy `.env.example` to `.env.local` and set
`VITE_API_BASE_URL`. All API routes are versioned under `/api/v1` (for example `/api/v1/health`).

Without a running backend, the Manager shell shows `API: unavailable`; that is expected.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request: `npm ci`, lint,
typecheck, test and build, then checks that both entry points were built.
