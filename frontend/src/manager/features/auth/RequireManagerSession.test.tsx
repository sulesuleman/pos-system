import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireManagerSession } from './RequireManagerSession'
import * as ownerAuth from '../../../shared/api/ownerAuth'

const MANAGER = { userId: '1', martId: '2', martName: 'Test Mart', firstName: 'Bilal', lastName: 'Ahmed', role: 'Manager' }

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route
          path="/manager"
          element={
            <RequireManagerSession>
              <div>protected content</div>
            </RequireManagerSession>
          }
        />
        <Route path="/auth/sign-in" element={<div>owner sign-in page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireManagerSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading placeholder while the session check is pending, never the protected content', () => {
    vi.spyOn(ownerAuth, 'getSession').mockReturnValue(new Promise(() => {}))

    renderGuarded()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders children once the session is a valid Manager session', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: true, owner: MANAGER })

    renderGuarded()

    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })

  it('redirects to /auth/sign-in once the session is invalid', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false, reason: 'error' })

    renderGuarded()

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })

  it('redirects to /auth/sign-in when a valid session is signed in as a different Role (an Owner hitting /manager directly)', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: true, owner: { ...MANAGER, role: 'Owner' } })

    renderGuarded()

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })
})
