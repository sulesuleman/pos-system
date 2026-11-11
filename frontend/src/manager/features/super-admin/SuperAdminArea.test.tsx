import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { SuperAdminArea } from './SuperAdminArea'
import * as marts from '../../../shared/api/marts'

function renderArea() {
  return render(
    <AppThemeProvider>
      <SuperAdminArea />
    </AppThemeProvider>,
  )
}

describe('SuperAdminArea', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Marts heading and the Marts list', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' }],
    })

    renderArea()

    expect(screen.getByRole('heading', { name: 'Marts' })).toBeInTheDocument()
    expect(await screen.findByText('Mart A')).toBeInTheDocument()
  })

  it('opens the Create Mart dialog from the button', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({ ok: true, marts: [] })

    renderArea()
    await screen.findByText(/create one to get started/i)
    fireEvent.click(screen.getByRole('button', { name: 'Create Mart' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('refreshes the Marts list after a successful create is acknowledged', async () => {
    const listMartsSpy = vi
      .spyOn(marts, 'listMarts')
      .mockResolvedValueOnce({ ok: true, marts: [] })
      .mockResolvedValueOnce({
        ok: true,
        marts: [{ id: '2', name: 'New Mart', code: 'XYZ999', status: 'active' }],
      })
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '2', martCode: 'XYZ999', ownerStaffId: '1002', setupCode: 'SETUP-2' },
    })

    renderArea()
    await screen.findByText(/create one to get started/i)
    fireEvent.click(screen.getByRole('button', { name: 'Create Mart' }))

    fireEvent.change(screen.getByLabelText(/Mart name/), { target: { value: 'New Mart' } })
    fireEvent.change(screen.getByLabelText(/Owner name/), { target: { value: 'Owner' } })
    fireEvent.change(screen.getByLabelText(/Owner contact/), { target: { value: 'contact' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Mart created')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('New Mart')).toBeInTheDocument()
    expect(listMartsSpy).toHaveBeenCalledTimes(2)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
