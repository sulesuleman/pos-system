import { alpha, type Theme } from '@mui/material/styles'
import type { PaginationProps } from '@mui/material/Pagination'
import { paginationItemClasses } from '@mui/material/PaginationItem'

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

declare module '@mui/material/Pagination' {
  interface PaginationPropsVariantOverrides {
    soft: true
  }

  interface PaginationPropsColorOverrides {
    info: true
    success: true
    warning: true
    error: true
  }
}

// ----------------------------------------------------------------------

export function pagination(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'

  const rootStyles = (ownerState: PaginationProps) => {
    const defaultColor = ownerState.color === 'standard'
    const filledVariant = ownerState.variant === 'text'
    const outlinedVariant = ownerState.variant === 'outlined'
    const softVariant = ownerState.variant === 'soft'

    const defaultStyle = {
      [`& .${paginationItemClasses.root}`]: {
        ...(outlinedVariant && {
          borderColor: alpha(theme.palette.grey[500], 0.24),
        }),

        [`&.${paginationItemClasses.selected}`]: {
          fontWeight: theme.typography.fontWeightMedium,
          borderRadius: 7,
          ...(outlinedVariant && {
            borderColor: 'currentColor',
          }),

          ...(defaultColor && {
            borderRadius: 7,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            ...(filledVariant && {
              color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
              backgroundColor: theme.palette.text.primary,
              '&:hover': {
                borderRadius: 7,
                backgroundColor: lightMode ? theme.palette.grey[700] : theme.palette.grey[100],
              },
            }),
          }),
        },
      },
    }

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        [`& .${paginationItemClasses.root}`]: {
          [`&.${paginationItemClasses.selected}`]: {
            ...(softVariant && {
              color: theme.palette[color][lightMode ? 'dark' : 'light'],
              backgroundColor: alpha(theme.palette[color].main, 0.08),
              '&:hover': {
                backgroundColor: alpha(theme.palette[color].main, 0.16),
              },
            }),
          },
        },
      }),
    }))

    return [defaultStyle, ...colorStyle]
  }

  return {
    MuiPagination: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: PaginationProps }) => rootStyles(ownerState),
      },
    },
  }
}
