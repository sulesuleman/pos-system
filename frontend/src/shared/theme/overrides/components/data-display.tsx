import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

// Smaller data-display components.
export function dataDisplay(theme: Theme) {
  return {
    MuiAvatarGroup: {
      defaultProps: {
        max: 4,
      },
      styleOverrides: {
        avatar: {
          ...theme.typography.caption,
          fontWeight: theme.typography.fontWeightMedium,
          marginLeft: -6,
          borderColor: theme.palette.background.paper,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: 12,
          lineHeight: '20px',
          fontWeight: theme.typography.fontWeightMedium,
          minWidth: 20,
          height: 20,
          padding: '0 6px',
        },
        dot: {
          minWidth: 10,
          width: 10,
          height: 10,
          borderRadius: '50%',
          padding: 0,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 500,
          backgroundColor: theme.palette.grey['500Transparent'][24],
        },
        bar: {
          borderRadius: 500,
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: {
        size: 44,
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: 'wave',
      },
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.grey['500Transparent'][12],
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    // Every toast appears top right, so a page never has to place its own
    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        fontSizeLarge: {
          fontSize: 32,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
        },
      },
    },
    MuiFab: {
      defaultProps: {
        color: 'primary',
      },
      styleOverrides: {
        root: {
          gap: 8,
          minWidth: 40,
          textTransform: 'none',
          boxShadow: theme.customShadows.z8,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        primary: {
          boxShadow: theme.customShadows.primary,
        },
      },
    },
    // Plain MUI tables only (the DataGrid override below has its own). Scoped under MuiTable so
    // a DataGrid's TablePagination, which renders as a table cell, is not touched.
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            ...theme.typography.body2,
            padding: 16,
            borderBottom: `1px dashed ${theme.palette.divider}`,
          },
          '& .MuiTableCell-head': {
            fontWeight: theme.typography.fontWeightMedium,
            lineHeight: '24px',
            color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
            backgroundColor: theme.palette.background.paper,
            borderBottom: 'none',
          },
          // pinned right under a sticky section header; the paper fill is opaque
          '& .MuiTableCell-stickyHeader': {
            top: 'var(--sticky-top, 0px)',
            zIndex: 2,
          },
          '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
            borderBottom: 'none',
          },
          '& .MuiTableRow-hover:hover > .MuiTableCell-root': {
            backgroundColor: theme.palette.action.hover,
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        // From `xl` a table fits its box, so the box does not scroll and the column head can pin
        // to the page; narrower, a wide table scrolls sideways in its box
        root: {
          paddingLeft: 8,
          paddingRight: 8,
          [theme.breakpoints.up('xl')]: { overflow: 'visible' },
        },
      },
    },
  }
}
