import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppThemeProvider } from '../../../theme'
import { Tabbar } from './index'

const items = [
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
]

describe('Tabbar', () => {
  it('renders every tab and marks the current value selected', () => {
    render(
      <AppThemeProvider>
        <Tabbar items={items} value="active" onChange={vi.fn()} />
      </AppThemeProvider>,
    )

    expect(screen.getByRole('tab', { name: 'Active', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Suspended', selected: false })).toBeInTheDocument()
  })

  it('calls onChange with the clicked tab’s value', () => {
    const onChange = vi.fn()
    render(
      <AppThemeProvider>
        <Tabbar items={items} value="active" onChange={onChange} />
      </AppThemeProvider>,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Suspended' }))

    expect(onChange).toHaveBeenCalledWith('suspended')
  })
})
