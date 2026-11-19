import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { TabletTopBar } from './index'

describe('TabletTopBar', () => {
  it('shows the app name and calls onMenu when the hamburger is clicked', () => {
    const onMenu = vi.fn()
    render(
      <AppThemeProvider>
        <TabletTopBar menuOpen={false} onMenu={onMenu} />
      </AppThemeProvider>,
    )

    expect(screen.getByText('POS System')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(onMenu).toHaveBeenCalledTimes(1)
  })
})
