import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireOwnerSession } from './RequireOwnerSession'
import * as ownerAuth from '../../../shared/api/ownerAuth'

const OWNER = { ownerId: '1', martId: '2', martName: 'Test Mart', firstName: 'Ayesha', lastName: 'Khan' }

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
        <Route path="/owners/sign-in" element={<div>owner sign-in page</div>} />
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

  it('redirects to /owners/sign-in once the session is invalid', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })

    renderGuarded()

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })
})
