import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { Sidebar } from './index'
import type { NavItem } from '../navConfig'

const items: NavItem[] = [{ label: 'Marts', icon: <span>icon</span>, path: '/super-admin' }]

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}, initialPath = '/super-admin') {
  const onSignOut = vi.fn()
  const view = render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar items={items} collapsed={false} onSignOut={onSignOut} signingOut={false} {...props} />
      </MemoryRouter>
    </AppThemeProvider>,
  )
  return { onSignOut, ...view }
}

describe('Sidebar', () => {
  it('renders the brand, theme toggle and every nav item with its label, expanded', () => {
    renderSidebar()

    expect(screen.getByText('POS System')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Marts/ })).toHaveAttribute('href', '/super-admin')
  })

  it('hides nav/brand labels when collapsed, but keeps the theme toggle visible', () => {
    renderSidebar({ collapsed: true })

    expect(screen.queryByText('POS System')).not.toBeInTheDocument()
    expect(screen.queryByText('Marts')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeInTheDocument()
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('calls onToggleCollapsed when the collapse button is clicked, and shows no toggle without it', () => {
    const onToggleCollapsed = vi.fn()
    renderSidebar({ onToggleCollapsed })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1)
  })

  it('renders no collapse toggle when onToggleCollapsed is not given (the mobile drawer case)', () => {
    renderSidebar({ onToggleCollapsed: undefined })

    expect(screen.queryByRole('button', { name: /sidebar/ })).not.toBeInTheDocument()
  })

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn()
    renderSidebar({ onNavigate })

    fireEvent.click(screen.getByRole('link', { name: /Marts/ }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('calls onSignOut when the sign-out button at the bottom is clicked, and disables it while signing out', () => {
    const { onSignOut, rerender } = renderSidebar()

    fireEvent.click(screen.getByTestId('sign-out-button'))
    expect(onSignOut).toHaveBeenCalledTimes(1)

    rerender(
      <AppThemeProvider>
        <MemoryRouter initialEntries={['/super-admin']}>
          <Sidebar items={items} collapsed={false} onSignOut={onSignOut} signingOut />
        </MemoryRouter>
      </AppThemeProvider>,
    )
    expect(screen.getByTestId('sign-out-button')).toBeDisabled()
  })
})
