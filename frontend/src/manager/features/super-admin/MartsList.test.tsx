import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { MartsList } from './MartsList'
import * as marts from '../../../shared/api/marts'

function renderMartsList() {
  return render(
    <AppThemeProvider>
      <MartsList />
    </AppThemeProvider>,
  )
}

describe('MartsList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a skeleton while loading', () => {
    vi.spyOn(marts, 'listMarts').mockReturnValue(new Promise(() => {}))

    renderMartsList()

    expect(screen.getByRole('status', { name: 'Loading Marts' })).toBeInTheDocument()
  })

  it('renders the Marts grid with name, code and status once loaded', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' }],
    })

    renderMartsList()

    expect(await screen.findByText('Mart A')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows an empty-state message when no Marts exist', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({ ok: true, marts: [] })

    renderMartsList()

    expect(await screen.findByText(/create one to get started/i)).toBeInTheDocument()
  })

  it('shows a generic error with retry on failure, and reloads on retry', async () => {
    const listMartsSpy = vi
      .spyOn(marts, 'listMarts')
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, marts: [] })

    renderMartsList()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText(/create one to get started/i)).toBeInTheDocument()
    expect(listMartsSpy).toHaveBeenCalledTimes(2)
  })
})
