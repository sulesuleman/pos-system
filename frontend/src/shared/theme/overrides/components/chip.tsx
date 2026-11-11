import { alpha, type Theme } from '@mui/material/styles'
import { type ChipProps, chipClasses } from '@mui/material/Chip'

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    soft: true
  }
}

// ----------------------------------------------------------------------

export function chip(theme: Theme) {
  // a phone (below `tablet`) draws a medium chip as a small one
  const PHONE = theme.breakpoints.down('tablet')

  const rootStyles = (ownerState: ChipProps) => {
    const defaultColor = ownerState.color === 'default'
    const filledVariant = ownerState.variant === 'filled'
    const outlinedVariant = ownerState.variant === 'outlined'
    const softVariant = ownerState.variant === 'soft'

    const defaultStyle = {
      [`& .${chipClasses.deleteIcon}`]: {
        width: 20,
        height: 20,
        opacity: 0.48,
        color: 'currentColor',
        '&:hover': {
          opacity: 1,
          color: 'currentColor',
        },
      },

      ...(defaultColor && {
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette.text.primary,
        },
        // FILLED - the neutral light-grey chip
        ...(filledVariant && {
          color: theme.palette.global.default.color,
          backgroundColor: theme.palette.global.default.bg,
          [`&.${chipClasses.clickable}:hover`]: {
            backgroundColor: theme.palette.global.default.bgHovered,
          },
          [`& .${chipClasses.icon}`]: {
            color: theme.palette.global.default.color,
          },
        }),
        ...(outlinedVariant && {
          border: `solid 1px ${theme.palette.components.button.outlined}`,
        }),
        ...(softVariant && {
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.grey[500], 0.16),
        }),
      }),
    }

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette[color].lighter,
          backgroundColor: theme.palette[color].dark,
        },
        ...(softVariant && {
          color: theme.palette[color].darkOrLight,
          backgroundColor: alpha(theme.palette[color].main, 0.16),
        }),
      }),
    }))

    const disabledState = {
      [`&.${chipClasses.disabled}`]: {
        opacity: 1,
        color: theme.palette.action.disabled,
        [`& .${chipClasses.icon}`]: {
          color: theme.palette.action.disabled,
        },
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette.action.disabled,
          backgroundColor: theme.palette.action.disabledBackground,
        },
        ...(filledVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
        ...(outlinedVariant && {
          borderColor: theme.palette.action.disabledBackground,
        }),
        ...(softVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
      },
    }

    return [
      defaultStyle,
      ...colorStyle,
      disabledState,
      {
        fontWeight: theme.typography.fontWeightRegular,
        fontSize: 13,
        lineHeight: '18px',
        borderRadius: 7,
      },
      // a phone draws a medium chip as a small one: 32 -> 24 tall
      ...(ownerState.size !== 'small' ? [{ [PHONE]: { height: 24 } }] : []),
    ]
  }

  return {
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: ChipProps }) => rootStyles(ownerState),
        // the size is read from ownerState (MUI 9 has no labelSmall slot)
        label: ({ ownerState }: { ownerState: ChipProps }) => {
          if (ownerState.size === 'small') return { paddingLeft: 8, paddingRight: 8 }
          return { paddingLeft: 12, paddingRight: 12, [PHONE]: { paddingLeft: 8, paddingRight: 8 } }
        },
      },
    },
  }
}
