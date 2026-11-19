import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { PageHeaderProvider } from '../../layout/PageHeaderProvider'
import { ManagerArea } from './ManagerArea'
import * as ownerAuth from '../../../shared/api/ownerAuth'

function renderArea() {
  return render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          <ManagerArea />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('ManagerArea', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows who is signed in and to which Mart once the session loads', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({
      ok: true,
      owner: { userId: '1', martId: '2', martName: 'Test Mart', firstName: 'Bilal', lastName: 'Ahmed', role: 'Manager' },
    })

    renderArea()

    expect(await screen.findByText('Signed in as Bilal Ahmed — Test Mart')).toBeInTheDocument()
  })
})
