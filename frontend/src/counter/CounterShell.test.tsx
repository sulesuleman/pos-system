import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppThemeProvider } from '../shared/theme'
import { CounterShell } from './CounterShell'

describe('CounterShell', () => {
  it('renders the Counter shell', () => {
    render(
      <AppThemeProvider>
        <CounterShell />
      </AppThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Counter' })).toBeInTheDocument()
  })
})
