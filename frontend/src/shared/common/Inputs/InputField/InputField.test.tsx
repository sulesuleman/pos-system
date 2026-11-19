import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MenuItem from '@mui/material/MenuItem'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { InputField } from './index'

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>)
}

describe('InputField', () => {
  it('passes a plain placeholder straight through on a text field', () => {
    renderWithTheme(<InputField label="Name" placeholder="e.g. Ayesha" value="" onChange={() => {}} />)

    expect(screen.getByPlaceholderText('e.g. Ayesha')).toBeInTheDocument()
  })

  it('shows the placeholder inside a select field while nothing is chosen', () => {
    renderWithTheme(
      <InputField select label="Branch" placeholder="Select a Branch" value="" onChange={() => {}}>
        <MenuItem value="b1">Main Branch</MenuItem>
      </InputField>,
    )

    expect(screen.getByText('Select a Branch')).toBeInTheDocument()
  })

  it('shows the chosen option\'s own label, not the placeholder, once a value is selected', () => {
    renderWithTheme(
      <InputField select label="Branch" placeholder="Select a Branch" value="b1" onChange={() => {}}>
        <MenuItem value="b1">Main Branch</MenuItem>
      </InputField>,
    )

    expect(screen.getByText('Main Branch')).toBeInTheDocument()
    expect(screen.queryByText('Select a Branch')).not.toBeInTheDocument()
  })

  it('renders a required select field label as "<Label> (required)"', () => {
    renderWithTheme(
      <InputField select label="Branch" placeholder="Select a Branch" required value="" onChange={() => {}}>
        <MenuItem value="b1">Main Branch</MenuItem>
      </InputField>,
    )

    expect(screen.getAllByText('Branch (required)').length).toBeGreaterThan(0)
  })
})
