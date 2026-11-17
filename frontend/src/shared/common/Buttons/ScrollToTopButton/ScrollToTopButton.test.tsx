import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../theme'
import { ScrollToTopButton } from './index'

function renderButton(threshold?: number) {
  return render(
    <AppThemeProvider>
      <ScrollToTopButton threshold={threshold} />
    </AppThemeProvider>,
  )
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true })
  // fireEvent (unlike a raw window.dispatchEvent) wraps the listener's resulting state update
  // in `act()`, so the assertions right after see the committed render, not a stale one.
  fireEvent.scroll(window)
}

describe('ScrollToTopButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setScrollY(0)
  })

  it('stays hidden (not reachable by keyboard) below the threshold', () => {
    renderButton(100)

    // aria-hidden zeroes out the accessible name computation, so this is found by its
    // (hidden-eligible) role alone, not by name - its attributes are asserted directly instead.
    const button = screen.getByRole('button', { hidden: true })
    expect(button).toHaveAttribute('aria-label', 'Scroll to top')
    expect(button).toHaveAttribute('tabindex', '-1')
    expect(button).toHaveAttribute('aria-hidden', 'true')
  })

  it('becomes visible and reachable once scrolled past the threshold', () => {
    renderButton(100)

    setScrollY(150)

    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button).toHaveAttribute('tabindex', '0')
    expect(button).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('scrolls the window back to the top when clicked', () => {
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy
    renderButton(100)
    setScrollY(150)

    fireEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
