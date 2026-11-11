import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { CreateMartDialog } from './CreateMartDialog'
import * as marts from '../../../shared/api/marts'

function renderDialog(onClose = vi.fn(), onCreated = vi.fn()) {
  const view = render(
    <AppThemeProvider>
      <CreateMartDialog open onClose={onClose} onCreated={onCreated} />
    </AppThemeProvider>,
  )
  return { onClose, onCreated, rerender: view.rerender }
}

function fillForm(martName: string, ownerName: string, ownerContact: string) {
  fireEvent.change(screen.getByLabelText(/Mart name/), { target: { value: martName } })
  fireEvent.change(screen.getByLabelText(/Owner name/), { target: { value: ownerName } })
  fireEvent.change(screen.getByLabelText(/Owner contact/), { target: { value: ownerContact } })
}

describe('CreateMartDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens with empty fields', () => {
    renderDialog()

    expect(screen.getByLabelText(/Mart name/)).toHaveValue('')
    expect(screen.getByLabelText(/Owner name/)).toHaveValue('')
    expect(screen.getByLabelText(/Owner contact/)).toHaveValue('')
  })

  it('blocks save and shows a validation message per empty field, without sending a request', () => {
    const createMartSpy = vi.spyOn(marts, 'createMart')
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText('This field is required.')).toHaveLength(3)
    expect(createMartSpy).not.toHaveBeenCalled()
  })

  it('disables save and shows a spinner while submitting, then reveals the one-time codes on success', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'SETUP-1' },
    })
    renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Mart created')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('SETUP-1')).toBeInTheDocument()
  })

  it('shows a generic inline error and keeps the dialog open with fields filled on failure', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({ ok: false, reason: 'error' })
    renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(screen.getByLabelText(/Mart name/)).toHaveValue('Mart A')
  })

  it('cannot be dismissed via Escape while the reveal is shown', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'SETUP-1' },
    })
    const { onClose, onCreated } = renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Mart created')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

    expect(screen.getByText('Mart created')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('calls onCreated and clears the reveal once Done is clicked', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'SETUP-1' },
    })
    const { onCreated } = renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Mart created')

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('calls onClose and resets the form on Cancel', () => {
    const { onClose } = renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the specific field message on a server-side validation error, not the generic one', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: false,
      reason: 'validation',
      errors: { martName: 'That Mart name is already taken.' },
    })
    renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('That Mart name is already taken.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('leaves no trace of the previous reveal or form values once reopened for a new Mart', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'SETUP-1' },
    })
    const onClose = vi.fn()
    const onCreated = vi.fn()
    const { rerender } = renderDialog(onClose, onCreated)
    fillForm('Mart A', 'Owner A', '0300-1234567')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Mart created')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    rerender(
      <AppThemeProvider>
        <CreateMartDialog open={false} onClose={onClose} onCreated={onCreated} />
      </AppThemeProvider>,
    )
    rerender(
      <AppThemeProvider>
        <CreateMartDialog open onClose={onClose} onCreated={onCreated} />
      </AppThemeProvider>,
    )

    expect(screen.getByLabelText(/Mart name/)).toHaveValue('')
    expect(screen.getByLabelText(/Owner name/)).toHaveValue('')
    expect(screen.getByLabelText(/Owner contact/)).toHaveValue('')
    expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
    expect(screen.queryByText('1001')).not.toBeInTheDocument()
    expect(screen.queryByText('SETUP-1')).not.toBeInTheDocument()
  })

  it('can still be dismissed via Escape during form entry (only the reveal step blocks it)', () => {
    const { onClose } = renderDialog()
    fillForm('Mart A', 'Owner A', '0300-1234567')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
