import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../../shared/theme'
import { StaffList } from './StaffList'
import * as staffApi from '../../../../shared/api/staff'

function renderStaffList() {
  return render(
    <AppThemeProvider>
      <StaffList />
    </AppThemeProvider>,
  )
}

const MANAGER = {
  id: '1',
  staffId: '1001',
  firstName: 'Bilal',
  lastName: 'Ahmed',
  email: 'bilal@example.com',
  role: 'Manager',
  active: true,
  branchId: 'branch-1',
  branchName: 'Main Branch',
}

describe('StaffList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a skeleton while loading', () => {
    vi.spyOn(staffApi, 'listStaff').mockReturnValue(new Promise(() => {}))

    renderStaffList()

    expect(screen.getByRole('status', { name: 'Loading staff' })).toBeInTheDocument()
  })

  it('renders the staff grid with name, staff ID, role, Branch and status once loaded', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [MANAGER] })

    renderStaffList()

    expect(await screen.findByText('Bilal Ahmed')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
    expect(screen.getByText('Main Branch')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows "Pending activation" for a staff member who has not activated yet', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [{ ...MANAGER, active: false }] })

    renderStaffList()

    expect(await screen.findByText('Pending activation')).toBeInTheDocument()
  })

  it('shows an empty-state message when no staff exist', async () => {
    vi.spyOn(staffApi, 'listStaff').mockResolvedValue({ ok: true, staff: [] })

    renderStaffList()

    expect(await screen.findByText(/create one to get started/i)).toBeInTheDocument()
  })

  it('shows a generic error with retry on failure, and reloads on retry', async () => {
    const listStaffSpy = vi
      .spyOn(staffApi, 'listStaff')
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, staff: [] })

    renderStaffList()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText(/create one to get started/i)).toBeInTheDocument()
    expect(listStaffSpy).toHaveBeenCalledTimes(2)
  })
})
