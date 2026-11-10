import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import { theme } from '../shared/theme'
import { CounterShell } from './CounterShell'

describe('CounterShell', () => {
  it('renders the Counter shell', () => {
    render(
      <ThemeProvider theme={theme}>
        <CounterShell />
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Counter' })).toBeInTheDocument()
  })
})
