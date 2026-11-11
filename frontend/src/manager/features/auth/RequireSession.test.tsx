import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireSession } from './RequireSession'
import * as superAdminAuth from '../../../shared/api/superAdminAuth'

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/super-admin']}>
      <Routes>
        <Route
          path="/super-admin"
          element={
            <RequireSession>
              <div>protected content</div>
            </RequireSession>
          }
        />
        <Route path="/super-admin/sign-in" element={<div>sign-in page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading placeholder while the session check is pending, never the protected content', () => {
    vi.spyOn(superAdminAuth, 'getSession').mockReturnValue(new Promise(() => {}))

    renderGuarded()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders children once the session is valid', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: true })

    renderGuarded()

    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })

  it('redirects to /super-admin/sign-in once the session is invalid', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: false })

    renderGuarded()

    expect(await screen.findByText('sign-in page')).toBeInTheDocument()
  })
})
