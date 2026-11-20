import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { PageLayout } from '../../../layout/PageLayout'
import { PageHeaderProvider } from '../../../layout/PageHeaderProvider'
import { StaffPage } from './StaffPage'
import * as staffApi from '../../../../shared/api/staff'
import * as branchesApi from '../../../../shared/api/branches'
import * as rolesApi from '../../../../shared/api/roles'

const BRANCH = { id: 'branch-1', name: 'Main Branch', location: 'Downtown', timeZone: 'Asia/Karachi', isActive: true }
const ROLE = { id: 'role-1', name: 'Manager', isSystemDefault: true, permissionIds: ['perm-1'] }

// The "Create Staff" button renders via the shell's PageLayout hero (its page-specific
// `rightContent` slot - see PageHeaderContext), not inside StaffPage itself, so PageLayout has
// to be mounted alongside it for that button to actually appear in the DOM here - same pattern
// as SuperAdminArea.test.tsx.
function renderPage() {
  return render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          <PageLayout />
          <StaffPage />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('StaffPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the staff list and the Create Staff button', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({
      ok: true,
      staff: [
        {
          id: '1',
          staffId: '1001',
          firstName: 'Bilal',
          lastName: 'Ahmed',
          email: 'bilal@example.com',
          role: 'Manager',
          activated: true,
          isActive: true,
          branchId: 'branch-1',
          branchName: 'Main Branch',
        },
      ],
    })

    renderPage()

    expect(screen.getByRole('button', { name: 'Create Staff' })).toBeInTheDocument()
    expect(await screen.findByText('Bilal Ahmed')).toBeInTheDocument()
  })

  it('opens the Create Staff dialog from the button', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [] })
    vi.spyOn(branchesApi, 'listBranches').mockResolvedValue({ ok: true, branches: [BRANCH] })
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [ROLE] })

    renderPage()
    await screen.findByText(/create one to get started/i)
    fireEvent.click(screen.getByRole('button', { name: 'Create Staff' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('refreshes the staff list after a successful create is acknowledged', async () => {
    const listStaffSpy = vi
      .spyOn(staffApi, 'listStaff')
      .mockResolvedValueOnce({ ok: true, staff: [] })
      .mockResolvedValueOnce({
        ok: true,
        staff: [
          {
            id: '2',
            staffId: '1002',
            firstName: 'New',
            lastName: 'Manager',
            email: 'new-manager@example.com',
            role: 'Manager',
            activated: false,
            isActive: true,
            branchId: 'branch-1',
            branchName: 'Main Branch',
          },
        ],
      })
    vi.spyOn(branchesApi, 'listBranches').mockResolvedValue({ ok: true, branches: [BRANCH] })
    vi.spyOn(rolesApi, 'listRoles').mockResolvedValue({ ok: true, roles: [ROLE] })
    vi.spyOn(staffApi, 'createStaff').mockResolvedValue({
      ok: true,
      staff: { userId: '2', staffId: '1002', setupCode: 'SETUP-2' },
    })

    renderPage()
    await screen.findByText(/create one to get started/i)
    fireEvent.click(screen.getByRole('button', { name: 'Create Staff' }))

    await screen.findByRole('combobox', { name: /Branch/ })
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'New' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Manager' } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'new-manager@example.com' } })
    fireEvent.change(screen.getByLabelText(/Contact/), { target: { value: '+923001234567' } })
    fireEvent.change(screen.getByLabelText(/CNIC/), { target: { value: '1234512345671' } })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Role/ }))
    fireEvent.click(await screen.findByRole('option', { name: ROLE.name }))
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Branch/ }))
    fireEvent.click(await screen.findByRole('option', { name: BRANCH.name }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Staff member created')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('New Manager')).toBeInTheDocument()
    expect(listStaffSpy).toHaveBeenCalledTimes(2)
  })

  const MANAGER_ROW = {
    id: '1',
    staffId: '1001',
    firstName: 'Bilal',
    lastName: 'Ahmed',
    email: 'bilal@example.com',
    role: 'Manager',
    activated: true,
    isActive: true,
    branchId: 'branch-1',
    branchName: 'Main Branch',
  }

  it('disables a staff member after confirming, and refreshes the list', async () => {
    const listStaffSpy = vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [MANAGER_ROW] })
    const disableStaffSpy = vi.spyOn(staffApi, 'disableStaff').mockResolvedValue({ ok: true })

    renderPage()
    await screen.findByText('Bilal Ahmed')
    fireEvent.click(screen.getByRole('button', { name: 'Disable Bilal Ahmed' }))

    expect(await screen.findByText(/will no longer be able to sign in/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    await vi.waitFor(() => expect(disableStaffSpy).toHaveBeenCalledWith('1'))
    await vi.waitFor(() => expect(listStaffSpy).toHaveBeenCalledTimes(2))
  })

  it('shows the refused-action message when disabling is unauthorized', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [MANAGER_ROW] })
    vi.spyOn(staffApi, 'disableStaff').mockResolvedValue({ ok: false, reason: 'unauthorized' })

    renderPage()
    await screen.findByText('Bilal Ahmed')
    fireEvent.click(screen.getByRole('button', { name: 'Disable Bilal Ahmed' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }))

    expect(await screen.findByText(/don't have permission/i)).toBeInTheDocument()
  })

  it('resets credentials after confirming and reveals the new setup code', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [MANAGER_ROW] })
    const resetSpy = vi.spyOn(staffApi, 'resetStaffCredentials').mockResolvedValue({ ok: true, setupCode: 'NEWCODE1' })

    renderPage()
    await screen.findByText('Bilal Ahmed')
    fireEvent.click(screen.getByRole('button', { name: 'Reset credentials for Bilal Ahmed' }))

    expect(await screen.findByText(/stops working immediately/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    await vi.waitFor(() => expect(resetSpy).toHaveBeenCalledWith('1'))
    expect(await screen.findByText('NEWCODE1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  })
})
