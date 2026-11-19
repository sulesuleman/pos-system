import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireOwnerSession } from './RequireOwnerSession'
import * as ownerAuth from '../../../shared/api/ownerAuth'

const OWNER = { userId: '1', martId: '2', martName: 'Test Mart', firstName: 'Ayesha', lastName: 'Khan', role: 'Owner' }

// Reads the redirect's own location.state so a test can assert what RequireOwnerSession actually
// handed the sign-in screen, not just that a redirect happened.
function SignInPageStub() {
  const location = useLocation()
  const message = (location.state as { martSuspendedMessage?: string } | null)?.martSuspendedMessage
  return <div>owner sign-in page{message !== undefined ? ` (${message})` : ''}</div>
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/owner']}>
      <Routes>
        <Route
          path="/owner"
          element={
            <RequireOwnerSession>
              <div>protected content</div>
            </RequireOwnerSession>
          }
        />
        <Route path="/auth/sign-in" element={<SignInPageStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireOwnerSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading placeholder while the session check is pending, never the protected content', () => {
    vi.spyOn(ownerAuth, 'getSession').mockReturnValue(new Promise(() => {}))

    renderGuarded()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders children once the session is valid', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: true, owner: OWNER })

    renderGuarded()

    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })

  it('redirects to /auth/sign-in once the session is invalid', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false, reason: 'error' })

    renderGuarded()

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })

  it('redirects to /auth/sign-in when a valid session is signed in as a different Role (a Manager hitting /owner directly)', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: true, owner: { ...OWNER, role: 'Manager' } })

    renderGuarded()

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })

  it("redirects to /auth/sign-in carrying the backend's own Mart-suspended message when the Mart was suspended mid-session", async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({
      ok: false,
      reason: 'mart-suspended',
      message: "This Mart's own backend-provided suspension message.",
    })

    renderGuarded()

    expect(
      await screen.findByText("owner sign-in page (This Mart's own backend-provided suspension message.)"),
    ).toBeInTheDocument()
  })
})
