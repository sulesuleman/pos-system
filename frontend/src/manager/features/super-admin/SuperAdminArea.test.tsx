import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { Header } from '../../layout/Header'
import { PageHeaderProvider } from '../../layout/PageHeaderProvider'
import { SuperAdminArea } from './SuperAdminArea'
import * as marts from '../../../shared/api/marts'

// The "Create Mart" button now renders via the shell's Header (its page-specific `actions`
// slot - see PageHeaderContext), not inside SuperAdminArea itself, so Header has to be mounted
// alongside it for that button to actually appear in the DOM here.
function renderArea() {
  return render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          <Header onOpenMobileNav={() => {}} scrolled={false} />
          <SuperAdminArea />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('SuperAdminArea', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Marts list and the Create Mart button', async () => {
    vi.spyOn(marts, 'listMarts').mockResolvedValue({
      ok: true,
      marts: [{ id: '1', name: 'Mart A', code: 'ABC123', status: 'active' }],
    })

    renderArea()

    // The "Marts" heading itself now lives in the shell's Header (see PageHeaderContext), not
    // in this component - this test stays scoped to what SuperAdminArea itself renders.
    expect(screen.getByRole('button', { name: 'Create Mart' })).toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Ayesha' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Khan' } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ayesha@example.com' } })
    fireEvent.change(screen.getByLabelText(/Contact/), { target: { value: '+923001234567' } })
    fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: '1234512345671' } })
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
