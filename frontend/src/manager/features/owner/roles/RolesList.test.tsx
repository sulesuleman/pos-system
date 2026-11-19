import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { RolesList } from './RolesList'
import * as rolesApi from '../../../../shared/api/roles'

function renderRolesList(onEdit = vi.fn(), onCopy = vi.fn()) {
  return render(
    <AppThemeProvider>
      <RolesList onEdit={onEdit} onCopy={onCopy} />
    </AppThemeProvider>,
  )
}

const MANAGER_ROLE = { id: 'role-manager', name: 'Manager', isSystemDefault: true, permissionIds: Array.from({ length: 13 }, (_, i) => `perm-${i}`) }
const OWNER_ROLE = { id: 'role-owner', name: 'Owner', isSystemDefault: true, permissionIds: [] }
const CUSTOM_ROLE = { id: 'role-custom', name: 'Shift Lead', isSystemDefault: false, permissionIds: ['perm-1', 'perm-2'] }

describe('RolesList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a skeleton while loading', () => {
    vi.spyOn(rolesApi, 'listRoles').mockReturnValue(new Promise(() => {}))

    renderRolesList()

    expect(screen.getByRole('status', { name: 'Loading Roles' })).toBeInTheDocument()
  })

  it('renders built-in and custom Roles with their permission counts', async () => {
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [MANAGER_ROLE, CUSTOM_ROLE] })

    renderRolesList()

    expect(await screen.findByText('Manager')).toBeInTheDocument()
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.getByText('13 of 14')).toBeInTheDocument()
    expect(screen.getByText('Shift Lead')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('2 of 14')).toBeInTheDocument()
  })

  it('hides the Edit/Duplicate actions for the Owner Role', async () => {
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [OWNER_ROLE, MANAGER_ROLE] })

    renderRolesList()
    await screen.findByText('Owner')

    expect(screen.queryByLabelText('Edit Owner')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Edit Manager')).toBeInTheDocument()
  })

  it('calls onEdit/onCopy with the clicked Role', async () => {
    const onEdit = vi.fn()
    const onCopy = vi.fn()
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [MANAGER_ROLE] })

    renderRolesList(onEdit, onCopy)
    await screen.findByText('Manager')
    fireEvent.click(screen.getByLabelText('Edit Manager'))
    fireEvent.click(screen.getByLabelText('Duplicate Manager'))

    expect(onEdit).toHaveBeenCalledWith(MANAGER_ROLE)
    expect(onCopy).toHaveBeenCalledWith(MANAGER_ROLE)
  })

  it('shows a generic error with retry on failure, and reloads on retry', async () => {
    const listRolesSpy = vi
      .spyOn(rolesApi, 'listRoles')
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, roles: [] })

    renderRolesList()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('No Roles yet.')).toBeInTheDocument()
    expect(listRolesSpy).toHaveBeenCalledTimes(2)
  })
})
