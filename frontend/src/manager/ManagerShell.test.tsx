import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { theme } from '../shared/theme'
import { ManagerShell } from './ManagerShell'

function renderShell() {
  return render(
    <ThemeProvider theme={theme}>
      <ManagerShell />
    </ThemeProvider>,
  )
}

describe('ManagerShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Manager shell and shows API: ok when the API is reachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    renderShell()

    expect(screen.getByRole('heading', { name: 'Manager' })).toBeInTheDocument()
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })

  it('shows API: checking… before the health request settles', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => {})))

    renderShell()

    expect(screen.getByText('API: checking…')).toBeInTheDocument()
  })

  it('shows API: unavailable and stays usable when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderShell()

    expect(await screen.findByText('API: unavailable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Manager' })).toBeInTheDocument()
  })
})
