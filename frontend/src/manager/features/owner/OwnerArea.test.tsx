import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { PageHeaderProvider } from '../../layout/PageHeaderProvider'
import { OwnerArea } from './OwnerArea'
import * as ownerAuth from '../../../shared/api/ownerAuth'

function renderArea() {
  return render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          <OwnerArea />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('OwnerArea', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows who is signed in and to which Mart once the session loads', async () => {
    vi.spyOn(ownerAuth, 'getSession').mockResolvedValue({
      ok: true,
      owner: { ownerId: '1', martId: '2', martName: 'Test Mart', firstName: 'Ayesha', lastName: 'Khan' },
    })

    renderArea()

    expect(await screen.findByText('Signed in as Ayesha Khan — Test Mart')).toBeInTheDocument()
  })
})
