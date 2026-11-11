import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../shared/theme'
import { ManagerShell } from './ManagerShell'
import * as superAdminAuth from '../shared/api/superAdminAuth'

function renderShell() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ManagerShell />}>
            <Route path="/" element={<div>child content</div>} />
          </Route>
          <Route path="/super-admin/sign-in" element={<div>sign-in page</div>} />
        </Routes>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('ManagerShell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Manager heading and the active route via Outlet', () => {
    renderShell()

    expect(screen.getByRole('heading', { name: 'Manager' })).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('clears local auth state and redirects to sign-in when sign-out succeeds', async () => {
    vi.spyOn(superAdminAuth, 'signOut').mockResolvedValue({ ok: true })

    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('sign-in page')).toBeInTheDocument()
  })

  it('still redirects to sign-in when the sign-out call fails', async () => {
    vi.spyOn(superAdminAuth, 'signOut').mockResolvedValue({ ok: false })

    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('sign-in page')).toBeInTheDocument()
  })
})
