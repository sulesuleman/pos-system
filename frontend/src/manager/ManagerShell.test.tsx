import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../shared/theme'
import { ManagerShell } from './ManagerShell'
import * as superAdminAuth from '../shared/api/superAdminAuth'
import { SUPER_ADMIN_NAV_ITEMS } from './layout/navConfig'

function renderShell() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={
              <ManagerShell
                navItems={SUPER_ADMIN_NAV_ITEMS}
                onSignOut={superAdminAuth.signOut}
                signOutRedirectPath="/super-admin/sign-in"
              />
            }
          >
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

  it('renders the sidebar brand, nav, and the active route via Outlet', () => {
    renderShell()

    // The mobile drawer's own copy of the sidebar also exists in the DOM (MUI's standard
    // responsive-drawer pattern - kept mounted, just closed), but is `aria-hidden` while closed,
    // so role-based queries correctly see only the permanent sidebar's copy here.
    expect(screen.getByRole('heading', { name: 'POS System' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Marts/ })).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('opens the mobile nav drawer from the header', () => {
    renderShell()
    // MUI's Drawer root is always `aria-hidden` (it's `role="presentation"`, not itself the
    // accessible content), so open/closed is asserted on the backdrop's own visibility instead
    // of a role query - this is exercising this app's wiring (the hamburger toggles `open`), not
    // MUI's own well-tested Drawer/Modal implementation.
    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement
    expect(backdrop.style.visibility).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    expect(backdrop.style.visibility).not.toBe('hidden')
  })

  it('toggles the sidebar between expanded and collapsed', () => {
    renderShell()

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
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
