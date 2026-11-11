import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function navigation(theme: Theme) {
  return {
    MuiBreadcrumbs: {
      styleOverrides: {
        ol: {
          rowGap: 4,
          columnGap: 16,
        },
        li: {
          ...theme.typography.body2,
        },
        separator: {
          margin: 0,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          ...theme.typography.subtitle2,
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: theme.palette.divider,
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 7,
        },
      },
    },
  }
}
