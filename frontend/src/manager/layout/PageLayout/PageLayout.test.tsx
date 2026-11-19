import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../shared/theme'
import { PageHeaderProvider } from '../PageHeaderProvider'
import { usePageHeader } from '../pageHeaderStore'
import { PageLayout } from './index'

function Screen({ heading, subheading, icon, onBack, breadcrumbs, rightContent, tabs }: Parameters<typeof usePageHeader>[0]) {
  usePageHeader({ heading, subheading, icon, onBack, breadcrumbs, rightContent, tabs })
  return <div>child content</div>
}

function renderPageLayout(pageHeaderProps: Parameters<typeof usePageHeader>[0] | null = { heading: 'Marts' }) {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <PageHeaderProvider>
          <Routes>
            <Route element={<PageLayout />}>
              <Route path="/" element={pageHeaderProps ? <Screen {...pageHeaderProps} /> : <div>child content</div>} />
            </Route>
          </Routes>
        </PageHeaderProvider>
      </MemoryRouter>
    </AppThemeProvider>,
  )
}

describe('PageLayout', () => {
  it('renders nothing for the hero until a screen declares a heading, but still renders the route', () => {
    renderPageLayout(null)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it("renders the active screen's heading, subheading and icon", () => {
    renderPageLayout({ heading: 'Marts', subheading: 'Every Mart on the platform.', icon: <span>icon</span> })

    expect(screen.getByRole('heading', { name: 'Marts' })).toBeInTheDocument()
    expect(screen.getByText('Every Mart on the platform.')).toBeInTheDocument()
    expect(screen.getByText('icon')).toBeInTheDocument()
  })

  it('shows a back button instead of the icon when onBack is given, and calls it', () => {
    const onBack = vi.fn()
    renderPageLayout({ heading: 'Mart details', icon: <span>icon</span>, onBack })

    expect(screen.queryByText('icon')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders page-specific action buttons', () => {
    renderPageLayout({ heading: 'Marts', rightContent: <button>Create Mart</button> })

    expect(screen.getByRole('button', { name: 'Create Mart' })).toBeInTheDocument()
  })

  it('renders a tabs row below the heading when given', () => {
    renderPageLayout({ heading: 'Marts', tabs: <div role="tablist">tabs here</div> })

    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('renders breadcrumbs only when there is more than one entry', () => {
    const { rerender } = renderPageLayout({ heading: 'Marts', breadcrumbs: [{ label: 'Marts' }] })
    expect(screen.queryByText('Marts', { selector: 'a, p.MuiTypography-caption' })).not.toBeInTheDocument()

    rerender(
      <AppThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <PageHeaderProvider>
            <Routes>
              <Route element={<PageLayout />}>
                <Route
                  path="/"
                  element={<Screen heading="Downtown Mart" breadcrumbs={[{ label: 'Marts', path: '/super-admin' }, { label: 'Downtown Mart' }]} />}
                />
              </Route>
            </Routes>
          </PageHeaderProvider>
        </MemoryRouter>
      </AppThemeProvider>,
    )
    expect(screen.getByRole('link', { name: 'Marts' })).toHaveAttribute('href', '/super-admin')
  })
})
