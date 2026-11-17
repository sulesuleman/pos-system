import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { OwnerSignInPage } from './OwnerSignInPage'
import * as ownerAuth from '../../../shared/api/ownerAuth'

function renderSignIn(initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/auth/sign-in']) {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/auth/sign-in" element={<OwnerSignInPage />} />
          <Route path="/owner" element={<div>owner area</div>} />
        </Routes>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

function fillAndSubmit(martCode: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Mart code/), { target: { value: martCode } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

const OWNER = { ownerId: '1', martId: '2', martName: 'Test Mart', firstName: 'Ayesha', lastName: 'Khan' }

describe('OwnerSignInPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /owner immediately when already authenticated', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: true, owner: OWNER })

    renderSignIn()

    expect(await screen.findByText('owner area')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Mart code/)).not.toBeInTheDocument()
  })

  it('renders the sign-in form once no session is found', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })

    renderSignIn()

    expect(await screen.findByLabelText(/Mart code/)).toBeInTheDocument()
  })

  it('navigates to /owner on correct credentials', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(ownerAuth, 'signIn').mockResolvedValue({ ok: true, owner: OWNER })

    renderSignIn()
    await screen.findByLabelText(/Mart code/)
    fillAndSubmit('ABC123', 'ayesha@example.com', 'correct-password')

    expect(await screen.findByText('owner area')).toBeInTheDocument()
  })

  it('shows a generic message and stays on sign-in for wrong credentials', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(ownerAuth, 'signIn').mockResolvedValue({ ok: false, reason: 'invalid-credentials' })

    renderSignIn()
    await screen.findByLabelText(/Mart code/)
    fillAndSubmit('ABC123', 'ayesha@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent("That Mart code, email or password isn't right.")
    expect(screen.getByLabelText(/Mart code/)).toBeInTheDocument()
  })

  it('shows a generic message and stays on sign-in for a network/API error', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(ownerAuth, 'signIn').mockResolvedValue({ ok: false, reason: 'error' })

    renderSignIn()
    await screen.findByLabelText(/Mart code/)
    fillAndSubmit('ABC123', 'ayesha@example.com', 'whatever')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    })
  })

  it('shows the activation banner when navigated here right after activating', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })

    renderSignIn([{ pathname: '/auth/sign-in', state: { activated: true } }])

    expect(await screen.findByTestId('owner-sign-in-activated-banner')).toHaveTextContent(
      'Account activated. Sign in with your new password.',
    )
  })

  it('does not show the activation banner on a plain visit', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({ ok: false })

    renderSignIn()
    await screen.findByLabelText(/Mart code/)

    expect(screen.queryByTestId('owner-sign-in-activated-banner')).not.toBeInTheDocument()
  })
})
