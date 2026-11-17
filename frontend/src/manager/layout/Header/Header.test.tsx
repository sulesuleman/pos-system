import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { PageHeaderProvider } from '../PageHeaderProvider'
import { usePageHeader } from '../pageHeaderStore'
import { Header } from './index'

function Screen({ heading, subheading, icon, onBack, breadcrumbs, rightContent, tabs }: Parameters<typeof usePageHeader>[0]) {
  usePageHeader({ heading, subheading, icon, onBack, breadcrumbs, rightContent, tabs })
  return null
}

function renderHeader(
  pageHeaderProps: Parameters<typeof usePageHeader>[0] | null = { heading: 'Marts' },
  scrolled = false,
) {
  const onOpenMobileNav = vi.fn()
  const view = render(
    <AppThemeProvider>
      <MemoryRouter>
        <PageHeaderProvider>
          {pageHeaderProps && <Screen {...pageHeaderProps} />}
          <Header onOpenMobileNav={onOpenMobileNav} scrolled={scrolled} />
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
  return { onOpenMobileNav, ...view }
}

describe('Header', () => {
  it('calls onOpenMobileNav when the hamburger is clicked', () => {
    const { onOpenMobileNav } = renderHeader()

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    expect(onOpenMobileNav).toHaveBeenCalledTimes(1)
  })

  it('renders nothing for the heading/icon block until a screen declares one', () => {
    renderHeader(null)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('renders the active screen’s heading, subheading and icon', () => {
    renderHeader({ heading: 'Marts', subheading: 'Every Mart on the platform.', icon: <span>icon</span> })

    expect(screen.getByRole('heading', { name: 'Marts' })).toBeInTheDocument()
    expect(screen.getByText('Every Mart on the platform.')).toBeInTheDocument()
    expect(screen.getByText('icon')).toBeInTheDocument()
  })

  it('shows a back button instead of the icon when onBack is given, and calls it', () => {
    const onBack = vi.fn()
    renderHeader({ heading: 'Mart details', icon: <span>icon</span>, onBack })

    expect(screen.queryByText('icon')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders page-specific action buttons, right-aligned', () => {
    renderHeader({ heading: 'Marts', rightContent: <button>Create Mart</button> })

    expect(screen.getByRole('button', { name: 'Create Mart' })).toBeInTheDocument()
  })

  it('renders a tabs row below the heading when given', () => {
    renderHeader({ heading: 'Marts', tabs: <div role="tablist">tabs here</div> })

    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('renders breadcrumbs only when there is more than one entry', () => {
    const { rerender } = renderHeader({ heading: 'Marts', breadcrumbs: [{ label: 'Marts' }] })
    expect(screen.queryByText('Marts', { selector: 'a, p.MuiTypography-caption' })).not.toBeInTheDocument()

    rerender(
      <AppThemeProvider>
        <MemoryRouter>
          <PageHeaderProvider>
            <Screen heading="Downtown Mart" breadcrumbs={[{ label: 'Marts', path: '/super-admin' }, { label: 'Downtown Mart' }]} />
            <Header onOpenMobileNav={vi.fn()} scrolled={false} />
          </PageHeaderProvider>
        </MemoryRouter>
      </AppThemeProvider>,
    )
    expect(screen.getByRole('link', { name: 'Marts' })).toHaveAttribute('href', '/super-admin')
  })

  it('blends with the page when not scrolled and picks up a blurred backdrop when scrolled', () => {
    const { rerender } = renderHeader({ heading: 'Marts' }, false)
    expect(getComputedStyle(screen.getByRole('banner')).backdropFilter).not.toContain('blur')

    rerender(
      <AppThemeProvider>
        <MemoryRouter>
          <PageHeaderProvider>
            <Screen heading="Marts" />
            <Header onOpenMobileNav={vi.fn()} scrolled />
          </PageHeaderProvider>
        </MemoryRouter>
      </AppThemeProvider>,
    )
    expect(getComputedStyle(screen.getByRole('banner')).backdropFilter).toContain('blur')
  })
})
