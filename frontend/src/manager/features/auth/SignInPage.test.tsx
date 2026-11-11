import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { SignInPage } from './SignInPage'
import * as superAdminAuth from '../../../shared/api/superAdminAuth'

function renderSignIn() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/super-admin/sign-in']}>
        <Routes>
          <Route path="/super-admin/sign-in" element={<SignInPage />} />
          <Route path="/super-admin" element={<div>super admin area</div>} />
        </Routes>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /super-admin immediately when already authenticated', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: true })

    renderSignIn()

    expect(await screen.findByText('super admin area')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
  })

  it('renders the sign-in form once no session is found', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: false })

    renderSignIn()

    expect(await screen.findByLabelText(/Email/)).toBeInTheDocument()
  })

  it('navigates to /super-admin on correct credentials', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(superAdminAuth, 'signIn').mockResolvedValue({ ok: true })

    renderSignIn()
    await screen.findByLabelText(/Email/)
    fillAndSubmit('owner@example.com', 'correct-password')

    expect(await screen.findByText('super admin area')).toBeInTheDocument()
  })

  it('shows a generic message and stays on sign-in for wrong credentials', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(superAdminAuth, 'signIn').mockResolvedValue({
      ok: false,
      reason: 'invalid-credentials',
    })

    renderSignIn()
    await screen.findByLabelText(/Email/)
    fillAndSubmit('owner@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  it('shows a generic message and stays on sign-in for a network/API error', async () => {
    vi.spyOn(superAdminAuth, 'getSession').mockResolvedValue({ ok: false })
    vi.spyOn(superAdminAuth, 'signIn').mockResolvedValue({ ok: false, reason: 'error' })

    renderSignIn()
    await screen.findByLabelText(/Email/)
    fillAndSubmit('owner@example.com', 'whatever')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    })
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })
})
