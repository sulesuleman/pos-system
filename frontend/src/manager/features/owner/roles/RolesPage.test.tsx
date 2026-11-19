import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { PageLayout } from '../../../layout/PageLayout'
import { PageHeaderProvider } from '../../../layout/PageHeaderProvider'
import { RolesPage } from './RolesPage'
import * as rolesApi from '../../../../shared/api/roles'

const PERMISSIONS = [{ id: 'perm-1', name: 'sell' }]
const MANAGER_ROLE = { id: 'role-manager', name: 'Manager', isSystemDefault: true, permissionIds: ['perm-1'] }
const CUSTOM_ROLE = { id: 'role-custom', name: 'Shift Lead', isSystemDefault: false, permissionIds: ['perm-1'] }

// Same pattern as StaffPage.test.tsx - the page-header "Create Role" button renders via
// PageLayout's rightContent slot, so it has to be mounted alongside RolesPage for the button to
// appear in the DOM here.
function renderPage() {
  return render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          <PageLayout />
          <RolesPage />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('RolesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Roles list and the Create Role button', async () => {
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [MANAGER_ROLE] })

    renderPage()

    expect(screen.getByRole('button', { name: 'Create Role' })).toBeInTheDocument()
    expect(await screen.findByText('Manager')).toBeInTheDocument()
  })

  it('creates a custom Role and refreshes the list', async () => {
    const listRolesSpy = vi
      .spyOn(rolesApi, 'listRoles')
      .mockResolvedValueOnce({ ok: true, roles: [] })
      .mockResolvedValueOnce({ ok: true, roles: [CUSTOM_ROLE] })
    vi.spyOn(rolesApi, 'listPermissions').mockResolvedValue({ ok: true, permissions: PERMISSIONS })
    vi.spyOn(rolesApi, 'createRole').mockResolvedValue({ ok: true, role: CUSTOM_ROLE })

    renderPage()
    await screen.findByText('No Roles yet.')
    fireEvent.click(screen.getByRole('button', { name: 'Create Role' }))

    await screen.findByText('sell')
    fireEvent.change(screen.getByLabelText(/Role name/), { target: { value: 'Shift Lead' } })
    fireEvent.click(screen.getByText('sell'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Shift Lead')).toBeInTheDocument()
    expect(listRolesSpy).toHaveBeenCalledTimes(2)
  })

  it('editing a built-in Role shows the fork notice and refreshes the list on save', async () => {
    const forkedRole = { ...MANAGER_ROLE, id: 'role-forked', isSystemDefault: false }
    const listRolesSpy = vi
      .spyOn(rolesApi, 'listRoles')
      .mockResolvedValueOnce({ ok: true, roles: [MANAGER_ROLE] })
      .mockResolvedValueOnce({ ok: true, roles: [forkedRole] })
    vi.spyOn(rolesApi, 'listPermissions').mockResolvedValue({ ok: true, permissions: PERMISSIONS })
    vi.spyOn(rolesApi, 'updateRole').mockResolvedValue({ ok: true, role: forkedRole })

    renderPage()
    await screen.findByText('Manager')
    fireEvent.click(screen.getByLabelText('Edit Manager'))

    expect(await screen.findByText(/Saving creates your own copy/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Custom')
    expect(listRolesSpy).toHaveBeenCalledTimes(2)
  })

  it('duplicating a Role opens Create Role pre-filled with its name and permissions', async () => {
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [MANAGER_ROLE] })
    vi.spyOn(rolesApi, 'listPermissions').mockResolvedValue({ ok: true, permissions: PERMISSIONS })

    renderPage()
    await screen.findByText('Manager')
    fireEvent.click(screen.getByLabelText('Duplicate Manager'))

    expect(await screen.findByLabelText(/Role name/)).toHaveValue('Manager (Duplicate)')
  })
})
