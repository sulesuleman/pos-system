import { forwardRef, useState, type MouseEvent, type ReactNode } from 'react'
import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { GRID_CHECKBOX_SELECTION_COL_DEF, type GridColDef, type GridRowId } from '@mui/x-data-grid'

// Below `laptop`, a list is a stack of cards: every row a card, every cell a line with its
// column's name before its value. The first column is the card's title; a card shows the
// title, the next two columns, and the action column - the rest wait behind "More details".
// A column can opt into that placement explicitly with `cardPriority`; `cardAction` marks the
// action column when its field/header isn't named "action(s)".

export type CardColumn = GridColDef & {
  cardPriority?: 'keep' | 'more'
  cardAction?: boolean
  /** Name the action column on the card (its header before its value), like any other line. */
  cardActionLabel?: boolean
}

// The rows a list lets you tick, as the grid's own checkbox column does - a tick at the card's end.
export type CardSelection = {
  ids: Set<GridRowId>
  selectable: (row: Record<string, unknown>) => boolean
  onChange: (id: GridRowId, checked: boolean) => void
}

const KEEP_AFTER_TITLE = 2
const ACTION_NAME = /^actions?$/i

function isAction(col: CardColumn): boolean {
  return !!col.cardAction || col.type === 'actions' || ACTION_NAME.test(col.field) || ACTION_NAME.test(col.headerName ?? '')
}

type Plan = { title?: CardColumn; keep: CardColumn[]; more: CardColumn[]; actions: CardColumn[] }

function planColumns(columns: CardColumn[]): Plan {
  const plan: Plan = { keep: [], more: [], actions: [] }
  let shown = 0
  for (const col of columns) {
    // the grid's own tick column can't be drawn outside the grid; a card draws its own tick
    if (col.field === GRID_CHECKBOX_SELECTION_COL_DEF.field) {
      continue
    }
    if (isAction(col)) {
      plan.actions.push(col)
    } else if (!plan.title && col.cardPriority !== 'more') {
      plan.title = col
    } else if (col.cardPriority === 'keep') {
      plan.keep.push(col)
    } else if (col.cardPriority === 'more') {
      plan.more.push(col)
    } else if (shown < KEEP_AFTER_TITLE) {
      plan.keep.push(col)
      shown += 1
    } else {
      plan.more.push(col)
    }
  }
  return plan
}

// A cell's content as the grid would draw it: its own renderCell, else its formatted value.
// MUI's column-definition callbacks are generic over the grid's internal row/API types in ways
// that don't resolve cleanly for an arbitrary caller-supplied column list - the same interop
// boundary the source component crossed with its own `any`s, kept narrow to this one function.
function cellContent(col: CardColumn, row: Record<string, unknown>, id: GridRowId, apiRef: unknown): ReactNode {
  const raw = row[col.field]
  const getterOrFormatter = (fn: unknown, ...args: unknown[]) => (fn as (...a: unknown[]) => unknown)(...args)
  const value = col.valueGetter ? getterOrFormatter(col.valueGetter, raw, row, col, apiRef) : raw
  const formattedValue = col.valueFormatter ? getterOrFormatter(col.valueFormatter, value, row, col, apiRef) : value
  if (col.renderCell) {
    return (col.renderCell as (params: unknown) => ReactNode)({
      id,
      row,
      value,
      formattedValue,
      field: col.field,
      colDef: col,
      api: (apiRef as { current?: unknown })?.current,
      hasFocus: false,
      tabIndex: -1,
    })
  }
  return formattedValue == null ? '' : String(formattedValue)
}

// One line of a card: its column's name, then its value, right-aligned.
const lineSx = {
  flex: '1 1 100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  minWidth: 0,
  textAlign: 'right' as const,
  padding: '6px 8px',
  // a value never pushes the card wider than the screen
  '& > *': { minWidth: 0, maxWidth: '100%' },
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="caption"
      component="span"
      sx={{ flexShrink: 0, maxWidth: '45%', textAlign: 'left', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  )
}

type ColumnCardProps = {
  row: Record<string, unknown>
  id: GridRowId
  plan: Plan
  apiRef: unknown
  onClick?: (row: Record<string, unknown>, event: MouseEvent<HTMLElement>) => void
  className?: string
  selection?: CardSelection
}

function ColumnCard({ row, id, plan, apiRef, onClick, className, selection }: ColumnCardProps) {
  const [open, setOpen] = useState(false)
  const skeleton = !!row.__skeleton
  const hasMore = plan.more.length > 0 && !skeleton
  const toggleLabel = open ? 'Fewer details' : 'More details'

  const valueLine = (col: CardColumn) => (
    <Box key={col.field} sx={lineSx}>
      <Label>{col.headerName}</Label>
      {skeleton ? <Skeleton variant="rounded" width="40%" height={16} /> : cellContent(col, row, id, apiRef)}
    </Box>
  )

  return (
    <Box
      className={className}
      onClick={onClick && !skeleton ? (event) => onClick(row, event) : undefined}
      sx={(theme) => ({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        py: 1,
        borderBottom: `1px dashed ${theme.palette.divider}`,
        '&:last-of-type': { borderBottom: 'none' },
        // the whole card is the row: tappable, and tinted whole when hovered
        ...(onClick &&
          !skeleton && {
            cursor: 'pointer',
            '&:hover': { backgroundColor: theme.palette.action.hover },
          }),
      })}
    >
      {plan.title && (
        <Box sx={{ ...lineSx, justifyContent: 'space-between', textAlign: 'left' }}>
          {skeleton ? <Skeleton variant="rounded" width="60%" height={20} /> : cellContent(plan.title, row, id, apiRef)}
          {selection && !skeleton && (
            <Checkbox
              size="small"
              checked={selection.ids.has(id)}
              disabled={!selection.selectable(row)}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => selection.onChange(id, event.target.checked)}
              sx={{ flexShrink: 0, p: 0.5, mr: -0.5 }}
            />
          )}
        </Box>
      )}
      {plan.keep.map(valueLine)}
      {open && plan.more.map(valueLine)}

      {/* the card's end: the More/Fewer toggle, then the action */}
      {hasMore && (
        <Box sx={{ order: 2, flex: '0 0 auto', display: 'flex', p: '6px 0 6px 8px' }}>
          <ButtonBase
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation()
              setOpen((o) => !o)
            }}
            sx={(theme) => ({
              width: 36,
              height: 36,
              borderRadius: '50%',
              color: 'text.secondary',
              backgroundColor: alpha(theme.palette.grey[500], 0.08),
              '&:hover': { backgroundColor: alpha(theme.palette.grey[500], 0.16) },
              '& svg': { width: 20, height: 20, transition: 'transform 150ms' },
              '&[aria-expanded="true"] svg': { transform: 'rotate(180deg)' },
              '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 9L12 15L6 9" />
            </svg>
          </ButtonBase>
        </Box>
      )}
      {!skeleton &&
        plan.actions.map((col) => (
          <Box
            key={col.field}
            sx={{
              ...lineSx,
              order: 3,
              flex: '1 1 0',
              // a named action reads like any other line: its name at the left, its value at the right
              justifyContent: col.cardActionLabel ? 'space-between' : 'flex-end',
              ...(hasMore && { pl: 1 }),
            }}
          >
            {col.cardActionLabel && <Label>{col.headerName}</Label>}
            {cellContent(col, row, id, apiRef)}
          </Box>
        ))}
    </Box>
  )
}

export type ColumnCardsProps = {
  rows: Record<string, unknown>[]
  columns: CardColumn[]
  getRowId?: (row: Record<string, unknown>) => GridRowId
  /** Columns hidden on the grid stay hidden on the cards. */
  columnVisibilityModel?: Record<string, boolean>
  onRowClick?: (row: Record<string, unknown>, event: MouseEvent<HTMLElement>) => void
  getRowClassName?: (row: Record<string, unknown>) => string
  selection?: CardSelection
  /** The grid's `useGridApiRef()` ref, forwarded to any column's valueGetter/valueFormatter/
   * renderCell that reads it - same as the grid itself would hand them. */
  apiRef?: unknown
}

// The cards themselves; the caller decides when (below `laptop`) and draws the card around them.
export const ColumnCards = forwardRef<HTMLDivElement, ColumnCardsProps>(function ColumnCards(
  { rows, columns, getRowId, columnVisibilityModel, onRowClick, getRowClassName, selection, apiRef },
  ref,
) {
  const visible = columns.filter((col) => columnVisibilityModel?.[col.field] !== false)
  const plan = planColumns(visible)
  return (
    <Box ref={ref} sx={{ px: 1 }}>
      {rows.map((row) => {
        const id = getRowId ? getRowId(row) : (row.id as GridRowId)
        return (
          <ColumnCard
            key={id}
            row={row}
            id={id}
            plan={plan}
            apiRef={apiRef}
            onClick={onRowClick}
            className={getRowClassName?.(row)}
            selection={selection}
          />
        )
      })}
    </Box>
  )
})
