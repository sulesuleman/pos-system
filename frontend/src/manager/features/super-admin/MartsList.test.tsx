import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import type { ComponentProps } from 'react'
import { MartsList } from './MartsList'
import * as marts from '../../../shared/api/marts'

function renderMartsList(props: Partial<ComponentProps<typeof MartsList>> = {}) {
  const onSuspend = vi.fn()
  const onReactivate = vi.fn()
  const view = render(
    <AppThemeProvider>
      <MartsList onSuspend={onSuspend} onReactivate={onReactivate} pendingMartId={null} {...props} />
    </AppThemeProvider>,
  )
  return { onSuspend, onReactivate, ...view }
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
    expect(screen.getByText('Active')).toBeInTheDocument()
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

  it('shows a Suspend action for an active Mart and calls onSuspend with it', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' }],
    })

    const { onSuspend } = renderMartsList()
    await screen.findByText('Mart A')

    fireEvent.click(screen.getByRole('button', { name: 'Suspend Mart A' }))
    expect(onSuspend).toHaveBeenCalledWith({ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' })
  })

  it('shows a Reactivate action for a suspended Mart and calls onReactivate with it', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'suspended' }],
    })

    const { onReactivate } = renderMartsList()
    await screen.findByText('Mart A')

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Mart A' }))
    expect(onReactivate).toHaveBeenCalledWith({ id: '1', name: 'Mart A', code: 'ABC123', status: 'suspended' })
  })

  it('disables every action while a Mart is pending, and shows a spinner on the pending one', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [
        { id: '1', name: 'Mart A', code: 'ABC123', status: 'active' },
        { id: '2', name: 'Mart B', code: 'XYZ999', status: 'active' },
      ],
    })

    renderMartsList({ pendingMartId: '1' })
    await screen.findByText('Mart A')

    expect(screen.getByRole('button', { name: 'Suspend Mart A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Suspend Mart B' })).toBeDisabled()
  })
})
