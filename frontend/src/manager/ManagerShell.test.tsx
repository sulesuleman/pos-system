import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppThemeProvider } from '../shared/theme'
import { ManagerShell } from './ManagerShell'

function renderShell() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ManagerShell />}>
            <Route path="/" element={<div>child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('ManagerShell', () => {
  it('renders the Manager heading and the active route via Outlet', () => {
    renderShell()

    expect(screen.getByRole('heading', { name: 'Manager' })).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
