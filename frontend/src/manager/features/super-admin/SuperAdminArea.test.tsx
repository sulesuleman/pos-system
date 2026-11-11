import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SuperAdminArea } from './SuperAdminArea'
import * as superAdminAuth from '../../../shared/api/superAdminAuth'
import * as health from '../../../shared/api/health'

function renderArea() {
  return render(
    <MemoryRouter initialEntries={['/super-admin']}>
      <Routes>
        <Route path="/super-admin" element={<SuperAdminArea />} />
        <Route path="/super-admin/sign-in" element={<div>sign-in page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SuperAdminArea', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Super Admin heading and the health line', async () => {
    vi.spyOn(health, 'getHealth').mockResolvedValue('ok')

    renderArea()

    expect(screen.getByRole('heading', { name: 'Super Admin' })).toBeInTheDocument()
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })

  it('shows API: checking… before the health request settles', () => {
    vi.spyOn(health, 'getHealth').mockReturnValue(new Promise(() => {}))

    renderArea()

    expect(screen.getByText('API: checking…')).toBeInTheDocument()
  })

  it('shows API: unavailable when the API is unreachable', async () => {
    vi.spyOn(health, 'getHealth').mockResolvedValue('unavailable')

    renderArea()

    expect(await screen.findByText('API: unavailable')).toBeInTheDocument()
  })

  it('clears local auth state and redirects to sign-in when sign-out succeeds', async () => {
    vi.spyOn(health, 'getHealth').mockResolvedValue('ok')
    vi.spyOn(superAdminAuth, 'signOut').mockResolvedValue({ ok: true })

    renderArea()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('sign-in page')).toBeInTheDocument()
  })

  it('still redirects to sign-in when the sign-out call fails', async () => {
    vi.spyOn(health, 'getHealth').mockResolvedValue('ok')
    vi.spyOn(superAdminAuth, 'signOut').mockResolvedValue({ ok: false })

    renderArea()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('sign-in page')).toBeInTheDocument()
  })
})
