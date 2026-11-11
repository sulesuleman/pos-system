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

type FormValues = {
  martName: string
  firstName: string
  lastName: string
  email: string
  contact: string
  cnic: string
}

const VALID_FORM: FormValues = {
  martName: 'Mart A',
  firstName: 'Ayesha',
  lastName: 'Khan',
  email: 'ayesha@example.com',
  contact: '+923001234567',
  cnic: '1234512345671',
}

function fillForm(overrides: Partial<FormValues> = {}) {
  const values = { ...VALID_FORM, ...overrides }
  fireEvent.change(screen.getByLabelText(/Mart name/), { target: { value: values.martName } })
  fireEvent.change(screen.getByLabelText(/First name/), { target: { value: values.firstName } })
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: values.lastName } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: values.email } })
  fireEvent.change(screen.getByLabelText(/Contact/), { target: { value: values.contact } })
  fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: values.cnic } })
}

describe('CreateMartDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens with all six fields empty', () => {
    renderDialog()

    expect(screen.getByLabelText(/Mart name/)).toHaveValue('')
    expect(screen.getByLabelText(/First name/)).toHaveValue('')
    expect(screen.getByLabelText(/Last name/)).toHaveValue('')
    expect(screen.getByLabelText(/Email/)).toHaveValue('')
    expect(screen.getByLabelText(/Contact/)).toHaveValue('')
    expect(screen.getByLabelText(/CNIC/)).toHaveValue('')
  })

  it('blocks save and shows a validation message per empty field, without sending a request', () => {
    const createMartSpy = vi.spyOn(marts, 'createMart')
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText('This field is required.')).toHaveLength(6)
    expect(createMartSpy).not.toHaveBeenCalled()
  })

  it('shows its own message for an invalid Email, blocking submit', () => {
    const createMartSpy = vi.spyOn(marts, 'createMart')
    renderDialog()
    fillForm({ email: 'not-an-email' })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(createMartSpy).not.toHaveBeenCalled()
  })

  it('shows its own message for an invalid Contact, blocking submit', () => {
    const createMartSpy = vi.spyOn(marts, 'createMart')
    renderDialog()
    fillForm({ contact: 'abc' })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument()
    expect(createMartSpy).not.toHaveBeenCalled()
  })

  it('auto-formats 13 typed digits into the canonical CNIC shape', () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: '1234512345671' } })

    expect(screen.getByLabelText(/CNIC/)).toHaveValue('12345-1234567-1')
  })

  it('blocks submit on an incomplete CNIC with its own message', () => {
    const createMartSpy = vi.spyOn(marts, 'createMart')
    renderDialog()
    fillForm({ cnic: '123451234' })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter a complete CNIC in the form 12345-1234567-1.')).toBeInTheDocument()
    expect(createMartSpy).not.toHaveBeenCalled()
  })

  it('disables save and shows a spinner while submitting, then reveals the one-time codes on success', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({
      ok: true,
      mart: { martId: '1', martCode: 'ABC123', ownerStaffId: '1001', setupCode: 'SETUP-1' },
    })
    renderDialog()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Mart created')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('SETUP-1')).toBeInTheDocument()
  })

  it('shows a generic inline error and keeps the dialog open with fields filled on failure', async () => {
    vi.spyOn(marts, 'createMart').mockResolvedValue({ ok: false, reason: 'error' })
    renderDialog()
    fillForm()

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
    fillForm()
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
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Mart created')

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('calls onClose and resets the form on Cancel', () => {
    const { onClose } = renderDialog()
    fillForm()

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
    fillForm()

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
    fillForm()
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
    expect(screen.getByLabelText(/First name/)).toHaveValue('')
    expect(screen.getByLabelText(/Last name/)).toHaveValue('')
    expect(screen.getByLabelText(/Email/)).toHaveValue('')
    expect(screen.getByLabelText(/Contact/)).toHaveValue('')
    expect(screen.getByLabelText(/CNIC/)).toHaveValue('')
    expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
    expect(screen.queryByText('1001')).not.toBeInTheDocument()
    expect(screen.queryByText('SETUP-1')).not.toBeInTheDocument()
  })

  it('can still be dismissed via Escape during form entry (only the reveal step blocks it)', () => {
    const { onClose } = renderDialog()
    fillForm()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
