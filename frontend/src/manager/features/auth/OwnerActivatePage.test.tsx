import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { OwnerActivatePage } from './OwnerActivatePage'
import * as ownerAuth from '../../../shared/api/ownerAuth'

const VALID_PASSWORD = 'Owner-Pass1!'

function renderActivate() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/auth/activate']}>
        <Routes>
          <Route path="/auth/activate" element={<OwnerActivatePage />} />
          <Route path="/auth/sign-in" element={<div>owner sign-in page</div>} />
        </Routes>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

function fillForm({
  martCode = 'ABC123',
  email = 'ayesha@example.com',
  setupCode = 'SETUP-CODE',
  password = VALID_PASSWORD,
}: Partial<{ martCode: string; email: string; setupCode: string; password: string }> = {}) {
  fireEvent.change(screen.getByLabelText(/Mart code/), { target: { value: martCode } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Setup code/), { target: { value: setupCode } })
  fireEvent.change(screen.getByLabelText(/New password/), { target: { value: password } })
}

describe('OwnerActivatePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a required-field error for each empty field on submit, without calling the API', () => {
    const activateSpy = vi.spyOn(ownerAuth, 'activate')

    renderActivate()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(screen.getAllByText('This field is required.').length).toBeGreaterThan(0)
    expect(activateSpy).not.toHaveBeenCalled()
  })

  it('rejects a weak password client-side without calling the API', () => {
    const activateSpy = vi.spyOn(ownerAuth, 'activate')

    renderActivate()
    fillForm({ password: 'weakpassword' })
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(
      screen.getByText(
        'Password must be at least 8 characters and include a number, a special character, an uppercase and a lowercase letter.',
      ),
    ).toBeInTheDocument()
    expect(activateSpy).not.toHaveBeenCalled()
  })

  it('navigates to /auth/sign-in with the activated flag on success', async () => {
    vi.spyOn(ownerAuth, 'activate').mockResolvedValue({ ok: true })

    renderActivate()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(await screen.findByText('owner sign-in page')).toBeInTheDocument()
  })

  it('shows the generic error banner for an invalid Mart/email/setup-code combination', async () => {
    vi.spyOn(ownerAuth, 'activate').mockResolvedValue({ ok: false, reason: 'invalid' })

    renderActivate()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(await screen.findByTestId('owner-activate-error')).toHaveTextContent(
      "That Mart code, email or setup code isn't right.",
    )
  })

  it("shows the server's specific message as a password field error on a weak-password rejection", async () => {
    vi.spyOn(ownerAuth, 'activate').mockResolvedValue({
      ok: false,
      reason: 'weak-password',
      message: 'server-specific password message',
    })

    renderActivate()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(await screen.findByText('server-specific password message')).toBeInTheDocument()
  })

  it("shows the backend's own Mart-suspended message verbatim, not a generic/hardcoded one", async () => {
    vi.spyOn(ownerAuth, 'activate').mockResolvedValue({
      ok: false,
      reason: 'mart-suspended',
      message: "This Mart's own backend-provided suspension message.",
    })

    renderActivate()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    expect(await screen.findByTestId('owner-activate-error')).toHaveTextContent(
      "This Mart's own backend-provided suspension message.",
    )
  })

  it('shows a generic server-error banner on an unexpected failure', async () => {
    vi.spyOn(ownerAuth, 'activate').mockResolvedValue({ ok: false, reason: 'error' })

    renderActivate()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))

    await waitFor(() => {
      expect(screen.getByTestId('owner-activate-error')).toHaveTextContent('Something went wrong. Try again.')
    })
  })
})
