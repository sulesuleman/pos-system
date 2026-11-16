import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ComponentProps } from 'react'
import { AppThemeProvider } from '../../../theme'
import { OverflowTooltip } from './index'

function renderTooltip(props: Partial<ComponentProps<typeof OverflowTooltip>> = {}) {
  return render(
    <AppThemeProvider>
      <OverflowTooltip text="Some value" {...props} />
    </AppThemeProvider>,
  )
}

describe('OverflowTooltip', () => {
  it('renders the given text', () => {
    renderTooltip()

    expect(screen.getByText('Some value')).toBeInTheDocument()
  })

  it('forwards extra Typography props (e.g. variant/color)', () => {
    renderTooltip({ color: 'error', variant: 'caption' })

    expect(screen.getByText('Some value')).toHaveClass('MuiTypography-caption')
  })

  it('does not throw when hovered, even though jsdom reports no overflow', () => {
    renderTooltip()

    // jsdom always reports scrollWidth === clientWidth, so this never registers as overflowing -
    // the important thing is the hover handler itself runs without error either way.
    expect(() => fireEvent.mouseEnter(screen.getByText('Some value'))).not.toThrow()
  })

  it('truncates with noWrap so long text never pushes its container wider', () => {
    renderTooltip({ text: 'A very long value that would otherwise overflow its container width' })

    expect(screen.getByText(/A very long value/)).toHaveClass('MuiTypography-noWrap')
  })
})
