import { buttonClasses } from '@mui/material/Button'
import { listClasses } from '@mui/material/List'
import { listItemIconClasses } from '@mui/material/ListItemIcon'
import { paperClasses } from '@mui/material/Paper'
import { type Theme, alpha } from '@mui/material/styles'
import { tablePaginationClasses } from '@mui/material/TablePagination'
import { paper } from '../../css'

// ----------------------------------------------------------------------
// Styling for MUI X's DataGrid (`@mui/x-data-grid`). That package is not a dependency of this
// app yet, so these overrides have no effect until/unless it is added - ported now so the look
// is already defined for when a Marts/data table screen needs it.
// ----------------------------------------------------------------------

export function dataGrid(theme: Theme) {
  const paperStyles = paper({ theme, dropdown: true })

  return {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderWidth: 1,
          borderColor: alpha(theme.palette.grey[500], 0.24),

          '& .MuiDataGrid-sortButton': {
            border: 'none !important',
            padding: 0,
            background: 'none',
            boxShadow: 'none',
          },
          '& .MuiDataGrid-cell': {
            border: 'none !important',
          },
          '& .MuiSvgIcon-root ': {
            color: theme.palette.text.primary,
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-cell--editing': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-cell--focus': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
            border: 'none',
          },
          '& .MuiDataGrid-overlay': {
            color: theme.palette.text.primary,
          },
          // Dashed separator between rows, drawn under the row so the rounded hover is not cut by it
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
            position: 'relative',
            borderRadius: theme.shape.borderRadius,
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderBottom: `1px dashed ${theme.palette.divider}`,
              pointerEvents: 'none',
            },
            '&.MuiDataGrid-row--lastVisible::after': {
              display: 'none',
            },
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
          },
          '& .MuiDataGrid-container--top': {
            backgroundColor: theme.palette.background.paper,
          },
          '.MuiDataGrid-columnHeaderTitle': {
            overflow: 'hidden',
            fontFamily: theme.typography.fontFamily,
            fontWeight: 500,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
            fontSize: '14px',
            lineHeight: '24px',
            letterSpacing: '0px',
          },
          [`& .${tablePaginationClasses.root}`]: {
            borderTop: 0,
          },
          [`& .${tablePaginationClasses.toolbar}`]: {
            height: 'auto',
            minHeight: 40,
            overflowY: 'hidden',
            color: theme.palette.text.secondary,
          },
          [`& .${tablePaginationClasses.actions}`]: {
            button: {
              cursor: 'pointer',
              borderWidth: 1,
              borderColor: alpha(theme.palette.action.selected, 0.16),
              borderRadius: theme.spacing(1.5),
              backgroundColor: 'transparent',
              width: '32px',
              height: '32px',
              color: theme.palette.text.primary,

              '&.Mui-selected': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.primary.main,
                borderColor: theme.palette.background.paper,
              },

              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },

              '&.Mui-disabled': {
                border: 'none',
                color: alpha(theme.palette.action.disabled, 0.8),
                cursor: 'not-allowed',
                opacity: 0.5,
              },
            },
          },

          [`& .${tablePaginationClasses.actions} .MuiIconButton-root.Mui-disabled`]: {
            opacity: 0.5,
            color: alpha(theme.palette.action.disabled, 0.9),
          },

          [`& .${tablePaginationClasses.select}`]: {
            paddingRight: theme.spacing(1.5),
          },
          [`& .${tablePaginationClasses.selectIcon}`]: {
            right: theme.spacing(1),
          },

          '& .MuiDataGrid-withBorderColor': {
            borderColor: 'transparent',
          },
          '& .MuiDataGrid-footerContainer': {
            overflow: 'hidden',
          },
          '--DataGrid-rowBorderColor': 'transparent',
          '--DataGrid-containerBackground': 'transparent',
        },
        footerContainer: {
          minHeight: 44,
          overflow: 'hidden',
        },
        cell: {
          borderBottom: '1px solid transparent ',
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '22px',
          letterSpacing: '0px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          '& .MuiTypography-root': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
        selectedRowCount: {
          whiteSpace: 'nowrap',
        },
        columnSeparator: {
          color: theme.palette.divider,
          display: 'none',
        },
        toolbarContainer: {
          padding: theme.spacing(2),
          overflowY: 'hidden',
          borderBottom: `1px solid transparent`,
          backgroundColor: theme.palette.background.neutral,
        },
        paper: {
          ...paperStyles,
          padding: 0,
        },
        menu: {
          [`& .${paperClasses.root}`]: {
            ...paperStyles,
          },
          [`& .${listClasses.root}`]: {
            padding: 0,
            [`& .${listItemIconClasses.root}`]: {
              minWidth: 0,
              marginRight: theme.spacing(2),
            },
          },
        },
        columnHeaders: {
          borderBottom: `1px solid transparent`,
          borderLeft: 'none',
          borderRight: 'none',
          fontWeight: 500,
          background: theme.palette.background.paper,
        },
        panelHeader: {
          padding: theme.spacing(2),
        },
        panelFooter: {
          padding: theme.spacing(2),
          justifyContent: 'flex-end',
          borderTop: '1px solid transparent',
          borderColor: 'transparent',
          [`& .${buttonClasses.root}`]: {
            '&:last-of-type': {
              marginLeft: theme.spacing(1.5),
              color: theme.palette.background.paper,
              backgroundColor: theme.palette.text.primary,
            },
          },
        },
        filterForm: {
          padding: theme.spacing(2),
        },
        filterFormValueInput: {
          marginLeft: theme.spacing(2),
        },
        filterFormColumnInput: {
          marginLeft: theme.spacing(2),
        },
        filterFormOperatorInput: {
          marginLeft: theme.spacing(2),
        },
      },
    },
  }
}
