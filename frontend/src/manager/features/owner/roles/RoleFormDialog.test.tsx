import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { RoleFormDialog } from './RoleFormDialog'
import * as rolesApi from '../../../../shared/api/roles'

const PERMISSIONS = [
  { id: 'perm-1', name: 'sell' },
  { id: 'perm-2', name: 'close Shifts' },
]

function renderDialog(props: Partial<React.ComponentProps<typeof RoleFormDialog>> = {}) {
  vi.spyOn(rolesApi, 'listPermissions').mockResolvedValue({ ok: true, permissions: PERMISSIONS })
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const onSubmit = vi.fn().mockResolvedValue({ ok: true })
  const view = render(
    <AppThemeProvider>
      <RoleFormDialog
        open
        title="Create Role"
        confirmText="Save"
        onClose={onClose}
        onSubmit={onSubmit}
        onSaved={onSaved}
        {...props}
      />
    </AppThemeProvider>,
  )
  return { onClose, onSaved, onSubmit, rerender: view.rerender }
}

describe('RoleFormDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders every fixed Permission as a checkbox once loaded', async () => {
    renderDialog()

    expect(await screen.findByText('sell')).toBeInTheDocument()
    expect(screen.getByText('close Shifts')).toBeInTheDocument()
  })

  it('blocks save and shows a validation message when name and Permissions are empty', async () => {
    const { onSubmit } = renderDialog()
    await screen.findByText('sell')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('This field is required.')).toBeInTheDocument()
    expect(screen.getByText('Select at least one Permission.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the name and the checked Permission ids', async () => {
    const { onSubmit, onSaved } = renderDialog()
    await screen.findByText('sell')

    fireEvent.change(screen.getByLabelText(/Role name/), { target: { value: 'Shift Lead' } })
    fireEvent.click(screen.getByText('sell'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Shift Lead', permissionIds: ['perm-1'] })
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('pre-fills from initialValues when editing', async () => {
    renderDialog({ initialValues: { name: 'Shift Lead', permissionIds: ['perm-2'] } })

    await screen.findByText('sell')
    expect(screen.getByLabelText(/Role name/)).toHaveValue('Shift Lead')
    expect(screen.getByLabelText('close Shifts')).toBeChecked()
    expect(screen.getByLabelText('sell')).not.toBeChecked()
  })

  it('shows the fork notice when editing a built-in Role', async () => {
    renderDialog({ forkNotice: true })

    expect(await screen.findByText(/Saving creates your own copy/)).toBeInTheDocument()
  })

  it('shows a Couldn\'t load Permissions message on failure', async () => {
    vi.spyOn(rolesApi, 'listPermissions').mockResolvedValue({ ok: false })
    render(
      <AppThemeProvider>
        <RoleFormDialog open title="Create Role" confirmText="Save" onClose={vi.fn()} onSubmit={vi.fn()} onSaved={vi.fn()} />
      </AppThemeProvider>,
    )

    expect(await screen.findByText("Couldn't load Permissions.")).toBeInTheDocument()
  })

  it('shows the server-side validation message for a duplicate name', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, reason: 'validation', errors: { name: 'A Role with this name already exists in this Mart.' } })
    renderDialog({ onSubmit })
    await screen.findByText('sell')

    fireEvent.change(screen.getByLabelText(/Role name/), { target: { value: 'Manager' } })
    fireEvent.click(screen.getByText('sell'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('A Role with this name already exists in this Mart.')).toBeInTheDocument()
  })
})
