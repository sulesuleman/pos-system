import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridColDef } from '@mui/x-data-grid'
import { AppThemeProvider } from '../../../theme'
import { StyledDataGrid } from './index'

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'code', headerName: 'Code' },
]

const rows = [
  { id: 1, name: 'Downtown Mart', code: 'AB12CD' },
  { id: 2, name: 'Uptown Mart', code: 'XY34ZW' },
]

function renderGrid(props: Partial<React.ComponentProps<typeof StyledDataGrid>> = {}) {
  return render(
    <AppThemeProvider>
      <div style={{ height: 400 }}>
        <StyledDataGrid columns={columns} rows={rows} height="400px" {...props} />
      </div>
    </AppThemeProvider>,
  )
}

describe('StyledDataGrid', () => {
  it('renders every row and column', () => {
    renderGrid()

    expect(screen.getByText('Downtown Mart')).toBeInTheDocument()
    expect(screen.getByText('Uptown Mart')).toBeInTheDocument()
    expect(screen.getByText('AB12CD')).toBeInTheDocument()
  })

  it('shows the empty state when there are no rows', () => {
    renderGrid({ rows: [] })

    expect(screen.getByText('No records found')).toBeInTheDocument()
  })

  it('calls onRowClick with the clicked row, ignoring skeleton rows', () => {
    const onRowClick = vi.fn()
    renderGrid({ onRowClick })

    fireEvent.click(screen.getByText('Downtown Mart'))

    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick.mock.calls[0][0].row).toEqual(rows[0])
  })

  it('shows the loaded/total footer when loadedCount, totalCount and entityLabel are given', () => {
    renderGrid({ loadedCount: 2, totalCount: 5, entityLabel: 'Marts' })

    expect(screen.getByText('2 of 5 Marts loaded')).toBeInTheDocument()
  })

  it('renders a caller-supplied footer instead of the automatic one when both are given', () => {
    renderGrid({
      footer: <div>Custom footer</div>,
      loadedCount: 2,
      totalCount: 5,
      entityLabel: 'Marts',
    })

    expect(screen.getByText('Custom footer')).toBeInTheDocument()
    expect(screen.queryByText(/loaded/)).not.toBeInTheDocument()
  })

  it('renders without a footer when loadedCount/totalCount/entityLabel are not given', () => {
    renderGrid()

    expect(screen.queryByText(/loaded/)).not.toBeInTheDocument()
  })
})
