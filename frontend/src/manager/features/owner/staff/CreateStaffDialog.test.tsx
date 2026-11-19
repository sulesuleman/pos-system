import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { CreateStaffDialog } from './CreateStaffDialog'
import * as staff from '../../../../shared/api/staff'
import * as branches from '../../../../shared/api/branches'
import * as roles from '../../../../shared/api/roles'

const BRANCH = { id: 'branch-1', name: 'Main Branch', location: 'Downtown', timeZone: 'Asia/Karachi', isActive: true }
const ROLE = { id: 'role-1', name: 'Manager', isSystemDefault: true, permissionIds: ['perm-1'] }

function renderDialog(onClose = vi.fn(), onCreated = vi.fn()) {
  vi.spyOn(branches, 'listBranches').mockResolvedValue({ ok: true, branches: [BRANCH] })
  vi.spyOn(roles, 'listRoles').mockResolvedValue({ ok: true, roles: [ROLE] })
  const view = render(
    <AppThemeProvider>
      <CreateStaffDialog open onClose={onClose} onCreated={onCreated} />
    </AppThemeProvider>,
  )
  return { onClose, onCreated, rerender: view.rerender }
}

type FormValues = {
  firstName: string
  lastName: string
  email: string
  contact: string
  cnic: string
  // Whether to pick a Role/Branch from their dropdowns (MUI's Select isn't a real <input> - it
  // needs a mousedown-then-click-the-option interaction, not fireEvent.change).
  pickRole: boolean
  pickBranch: boolean
}

const VALID_FORM: FormValues = {
  firstName: 'Bilal',
  lastName: 'Ahmed',
  email: 'bilal@example.com',
  contact: '+923001234567',
  cnic: '1234512345671',
  pickRole: true,
  pickBranch: true,
}

async function fillForm(overrides: Partial<FormValues> = {}) {
  const values = { ...VALID_FORM, ...overrides }
  await screen.findByRole('combobox', { name: /Branch/ })
  fireEvent.change(screen.getByLabelText(/First name/), { target: { value: values.firstName } })
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: values.lastName } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: values.email } })
  fireEvent.change(screen.getByLabelText(/Contact/), { target: { value: values.contact } })
  fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: values.cnic } })
  if (values.pickRole) {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Role/ }))
    fireEvent.click(await screen.findByRole('option', { name: ROLE.name }))
  }
  if (values.pickBranch) {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Branch/ }))
    fireEvent.click(await screen.findByRole('option', { name: BRANCH.name }))
  }
}

describe('CreateStaffDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens with all fields empty once Branches have loaded', async () => {
    renderDialog()

    await screen.findByRole('combobox', { name: /Branch/ })
    expect(screen.getByLabelText(/First name/)).toHaveValue('')
    expect(screen.getByLabelText(/Last name/)).toHaveValue('')
    expect(screen.getByLabelText(/Email/)).toHaveValue('')
    expect(screen.getByLabelText(/Contact/)).toHaveValue('')
    expect(screen.getByLabelText(/CNIC/)).toHaveValue('')
  })

  it('blocks save and shows a validation message per empty field, without sending a request', async () => {
    const createStaffSpy = vi.spyOn(staff, 'createStaff')
    renderDialog()
    await screen.findByRole('combobox', { name: /Branch/ })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText('This field is required.').length).toBeGreaterThanOrEqual(5)
    expect(screen.getByText('Select a Role.')).toBeInTheDocument()
    expect(screen.getByText('Select a Branch.')).toBeInTheDocument()
    expect(createStaffSpy).not.toHaveBeenCalled()
  })

  it('shows its own message for an invalid Email, blocking submit', async () => {
    const createStaffSpy = vi.spyOn(staff, 'createStaff')
    renderDialog()
    await fillForm({ email: 'not-an-email' })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(createStaffSpy).not.toHaveBeenCalled()
  })

  it('auto-formats 13 typed digits into the canonical CNIC shape', async () => {
    renderDialog()
    await screen.findByRole('combobox', { name: /Branch/ })

    fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: '1234512345671' } })

    expect(screen.getByLabelText(/CNIC/)).toHaveValue('12345-1234567-1')
  })

  it('shows a Couldn\'t load Branches message and still lets the rest of the form render on failure', async () => {
    vi.restoreAllMocks()
    vi.spyOn(branches, 'listBranches').mockResolvedValue({ ok: false })
    vi.spyOn(roles, 'listRoles').mockResolvedValue({ ok: true, roles: [ROLE] })
    render(
      <AppThemeProvider>
        <CreateStaffDialog open onClose={vi.fn()} onCreated={vi.fn()} />
      </AppThemeProvider>,
    )

    expect(await screen.findByText("Couldn't load Branches.")).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/)).toBeInTheDocument()
  })

  it('disables save and shows a spinner while submitting, then reveals the one-time codes on success', async () => {
    vi.spyOn(staff, 'createStaff').mockResolvedValue({ ok: true, staff: { userId: '1', staffId: '1001', setupCode: 'SETUP-1' } })
    renderDialog()
    await fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Staff member created')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('SETUP-1')).toBeInTheDocument()
  })

  it('shows a generic inline error and keeps the dialog open with fields filled on failure', async () => {
    vi.spyOn(staff, 'createStaff').mockResolvedValue({ ok: false, reason: 'error' })
    renderDialog()
    await fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(screen.getByLabelText(/First name/)).toHaveValue('Bilal')
  })

  it('calls onCreated once Done is clicked after a successful create', async () => {
    vi.spyOn(staff, 'createStaff').mockResolvedValue({ ok: true, staff: { userId: '1', staffId: '1001', setupCode: 'SETUP-1' } })
    const { onCreated } = renderDialog()
    await fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Staff member created')

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Cancel', async () => {
    const { onClose } = renderDialog()
    await fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the specific field message on a server-side validation error, not the generic one', async () => {
    vi.spyOn(staff, 'createStaff').mockResolvedValue({
      ok: false,
      reason: 'validation',
      errors: { email: 'A staff member with this email already exists in this Mart.' },
    })
    renderDialog()
    await fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('A staff member with this email already exists in this Mart.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
