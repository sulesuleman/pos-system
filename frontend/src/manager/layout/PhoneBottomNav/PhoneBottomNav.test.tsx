import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import type { NavItem } from '../navConfig'
import { PhoneBottomNav } from './index'

const items: NavItem[] = [{ label: 'Marts', icon: <span>icon</span>, path: '/super-admin' }]

describe('PhoneBottomNav', () => {
  it('renders every nav item plus a More action, and calls onMore when More is clicked', () => {
    const onMore = vi.fn()
    render(
      <AppThemeProvider>
        <MemoryRouter initialEntries={['/super-admin']}>
          <PhoneBottomNav items={items} moreOpen={false} onMore={onMore} />
        </MemoryRouter>
      </AppThemeProvider>,
    )

    expect(screen.getByText('Marts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(onMore).toHaveBeenCalledTimes(1)
  })
})
