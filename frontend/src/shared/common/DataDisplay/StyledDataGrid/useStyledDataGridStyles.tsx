import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'

// Style/sx objects for StyledDataGrid. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
//
// `noInternalScroll`: true when the grid has no fixed height of its own and grows with its
// rows instead - the page (or whichever ancestor scrolls) owns the one scrollbar, and the
// column header pins under it rather than under the grid's own (nonexistent) scroll box.
// `rowCursor`: 'pointer' when the caller passed `onRowClick`, so rows read as clickable.
export function useStyledDataGridStyles({
  noInternalScroll,
  rowCursor,
}: {
  noInternalScroll: boolean
  rowCursor: 'pointer' | 'default'
}) {
  const theme = useTheme()

  // The grid paints no colour/border/radius of its own - transparent rows, no rule between
  // them or under the header - so it reads as one surface with the card wrapping it.
  const surface: SxProps<Theme> = {
    border: 'none',
    borderRadius: 0,
    '--unstable_DataGrid-radius': '0px',
    backgroundColor: 'transparent',
    '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-container--top, & .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaders .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller':
      {
        // opaque, so rows scrolling under a pinned head stay hidden
        backgroundColor: theme.palette.background.paper,
        borderRadius: 0,
      },
    '& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitle': {
      color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
    },
    '& .MuiDataGrid-main, & .MuiDataGrid-virtualScroller, & .MuiDataGrid-virtualScrollerContent, & .MuiDataGrid-filler':
      { backgroundColor: 'transparent' },
    '& .MuiDataGrid-row:not(:hover):not(.Mui-selected)': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-overlay, & .MuiDataGrid-overlayWrapperInner': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-row::after': { display: 'none' },
    '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaders .MuiDataGrid-filler, & .MuiDataGrid-columnHeaders .MuiDataGrid-row--borderBottom':
      { borderBottom: 'none' },
    '& .MuiDataGrid-topContainer::after': { display: 'none' },
    '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': { px: 1.25 },
  }

  // Sticky column header, a thin custom scrollbar, no column separators, and the type scale
  // used for headers/cells (the font itself is inherited from the theme, not set here).
  const grid: SxProps<Theme> = {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overscrollBehavior: 'contain',
    boxShadow: 'none',
    '& .MuiDataGrid-main': { flex: 1, minHeight: 0, overflow: 'hidden' },
    '& .MuiDataGrid-virtualScroller': {
      overflowX: 'auto',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      '&::-webkit-scrollbar': { width: 4, height: 4 },
      '&::-webkit-scrollbar-track': {
        backgroundColor: alpha(theme.palette.grey[500], 0.16),
        borderRadius: 5,
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: alpha(theme.palette.grey[500], 0.4),
        borderRadius: 5,
        border: '2px solid transparent',
        backgroundClip: 'padding-box',
        '&:hover': { backgroundColor: alpha(theme.palette.grey[500], 0.6) },
      },
    },
    '& .MuiDataGrid-columnHeaders': { position: 'sticky', top: 0, zIndex: 2 },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 500,
      fontSize: 14,
      lineHeight: '24px',
    },
    '& .MuiDataGrid-cell': {
      display: 'flex',
      alignItems: 'center',
      fontWeight: 400,
      fontSize: 14,
      lineHeight: '22px',
    },
    '& .MuiDataGrid-columnSeparator': { display: 'none' },
    '& .MuiDataGrid-row': { cursor: rowCursor },
    '& .row-skeleton': { cursor: 'default', pointerEvents: 'none' },
    ...surface,
    ...(noInternalScroll && pageScrollGrid(theme)),
  }

  // The handoff's table card: rounded corners, the card shadow (none in dark mode / on a
  // phone, per the theme), clipped rather than hidden so a pinned header can still pin to it.
  const card: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    flex: noInternalScroll ? '0 0 auto' : 1,
    minHeight: 0,
    overflowAnchor: 'none',
    bgcolor: 'background.paper',
    px: 1,
    pb: 1,
    borderRadius: '20px',
    overflow: 'clip',
    boxShadow: theme.customShadows.card,
    [theme.breakpoints.down('tablet')]: { boxShadow: 'none' },
  }

  const wrapper: SxProps<Theme> = {
    minWidth: 0,
    overflowAnchor: 'none',
    backgroundColor: 'background.paper',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 0,
    ...(noInternalScroll
      ? {}
      : { flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }),
  }

  const emptyState: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    py: 4,
  }

  return { grid, card, wrapper, emptyState }
}

// A grid that grows with its rows: the page scrolls, once, and the column header pins to it -
// right under a sticky toolbar, whose height is `--sticky-top` (see useStickyTop in scroll.ts).
// From `xl` the table fits its box so nothing inside it is a scroll box of its own; narrower, a
// wide table scrolls sideways in its own box and its header stays at the top of that box.
function pageScrollGrid(theme: Theme): SxProps<Theme> {
  return {
    // clip, not hidden: corners are still cut, but the grid is no longer a scroll box
    overflow: 'clip',
    overscrollBehavior: 'auto',
    '& .MuiDataGrid-main, & .MuiDataGrid-virtualScroller': {
      overscrollBehavior: 'auto',
      overflowY: 'visible',
      overflowX: 'auto',
      [theme.breakpoints.up('xl')]: { overflowX: 'visible' },
    },
    [theme.breakpoints.down('xl')]: {
      '& .MuiDataGrid-virtualScroller': {
        // MUI's autoHeight writes `overflow: hidden` inline on the virtual scroller; only
        // !important outweighs that and keeps the sideways scroll usable below `xl`.
        overflowX: 'auto !important',
        scrollbarWidth: 'auto',
        '&::-webkit-scrollbar': { height: 10, width: 10 },
        '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.action.hover, borderRadius: 5 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.grey[500],
          borderRadius: 5,
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': { backgroundColor: theme.palette.grey[600] },
        },
      },
    },
    [theme.breakpoints.up('xl')]: {
      '& .MuiDataGrid-mainContent': { overflow: 'visible' },
      '& .MuiDataGrid-virtualScroller': { overflow: 'visible !important' },
    },
    '& .MuiDataGrid-topContainer, & .MuiDataGrid-columnHeaders': {
      top: 0,
      [theme.breakpoints.up('xl')]: { top: 'var(--sticky-top, 0px)' },
    },
  }
}
