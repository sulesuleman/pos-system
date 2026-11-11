import { alpha, type Theme } from '@mui/material/styles'
import { type ButtonProps, buttonClasses } from '@mui/material/Button'

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

declare module '@mui/material/Button' {
  interface ButtonPropsSizeOverrides {
    xl: true
  }
  interface ButtonPropsVariantOverrides {
    soft: true
    white: true
  }
}

// ----------------------------------------------------------------------

const SIZE = {
  small: { height: 30, px: 8, textPx: 4, radius: 8, icon: 18, fontSize: 13, lineHeight: 22 },
  medium: { height: 36, px: 12, textPx: 8, radius: 10, icon: 20, fontSize: 14, lineHeight: 24 },
  large: { height: 48, px: 16, textPx: 10, radius: 12, icon: 24, fontSize: 15, lineHeight: 26 },
}

export function button(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'
  // a phone (below `tablet`) draws every button one size down; small stays small
  const PHONE = theme.breakpoints.down('tablet')

  const rootStyles = (ownerState: ButtonProps) => {
    const containedVariant = ownerState.variant === 'contained'
    const outlinedVariant = ownerState.variant === 'outlined'
    const textVariant = ownerState.variant === 'text'
    const softVariant = ownerState.variant === 'soft'
    const whiteVariant = ownerState.variant === 'white'

    const inheritColor = ownerState.color === 'inherit'

    const smallSize = ownerState.size === 'small'
    const mediumSize = ownerState.size === 'medium'
    const largeSize = ownerState.size === 'large'
    const xlSize = ownerState.size === 'xl'

    const defaultStyle = {
      ...(inheritColor && {
        ...(containedVariant && {
          color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
          backgroundColor: lightMode ? theme.palette.grey[800] : theme.palette.common.white,
          '&:hover': {
            backgroundColor: lightMode ? theme.palette.grey[700] : theme.palette.grey[400],
          },
        }),
        ...(textVariant && {
          '&:hover': {
            backgroundColor: theme.palette.grey['500Transparent'][16],
          },
        }),
        ...(softVariant && {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.grey['500Transparent'][8],
          '&:hover': {
            backgroundColor: theme.palette.grey['500Transparent'][24],
          },
        }),
        ...(whiteVariant && {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          '&:hover': {
            backgroundColor: theme.palette.background.paper,
          },
        }),
        ...(outlinedVariant && {
          borderColor: theme.palette.components.button.outlined,
          '&:hover': {
            borderColor: 'currentColor',
            backgroundColor: theme.palette.action.hover,
          },
        }),
      }),
    }

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        ...(outlinedVariant && {
          borderColor: inheritColor ? theme.palette.grey['500Transparent'][32] : 'currentColor',
          '&:hover': {
            borderColor: inheritColor ? theme.palette.grey[900] : 'currentColor',
            boxShadow: '0 0 0 0.5px currentColor',
            backgroundColor: inheritColor
              ? alpha(theme.palette.action.hover, 0.08)
              : alpha(theme.palette[ownerState.color as typeof color].main, 0.08),
          },
        }),
        // Filled primary follows the page field under it. Light: the field is the light blue
        // gradient, so the button is primary darker, lifted toward white on hover. Dark: the
        // field is near black, so it is MUI's own main, dark on hover.
        ...(containedVariant &&
          color === 'primary' &&
          (lightMode
            ? {
                backgroundColor: theme.palette.primary.darker,
                '&:hover': {
                  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.darker}, white 12%)`,
                },
              }
            : {
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              })),
        ...(textVariant && {
          '&:hover': {
            backgroundColor: alpha(theme.palette[color].main, 0.08),
          },
        }),
        ...(softVariant && {
          color: theme.palette[color].darkOrLight,
          backgroundColor: alpha(theme.palette[color].main, 0.16),
          '&:hover': {
            backgroundColor: alpha(theme.palette[color].main, 0.32),
          },
        }),
        ...(whiteVariant && {
          color: theme.palette[color][lightMode ? 'dark' : 'light'],
          backgroundColor: theme.palette.background.paper,
          '&:hover': {
            backgroundColor: theme.palette.background.paper,
          },
        }),
      }),
    }))

    const disabledState = {
      [`&.${buttonClasses.disabled}`]: {
        ...(softVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
      },
    }

    const sizeStyle = (s: (typeof SIZE)[keyof typeof SIZE]) => ({
      minHeight: s.height,
      fontSize: s.fontSize,
      lineHeight: `${s.lineHeight}px`,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: textVariant ? s.textPx : s.px,
      paddingRight: textVariant ? s.textPx : s.px,
      borderRadius: s.radius,
      [`& .${buttonClasses.startIcon} > *, & .${buttonClasses.endIcon} > *`]: {
        width: s.icon,
        height: s.icon,
        fontSize: s.icon,
      },
    })

    const size = {
      // the gap does the spacing; MUI's own icon margins would double it
      minWidth: 64,
      gap: 8,
      [`& .${buttonClasses.startIcon}, & .${buttonClasses.endIcon}`]: {
        margin: 0,
      },
      ...(smallSize && sizeStyle(SIZE.small)),
      ...(mediumSize && { ...sizeStyle(SIZE.medium), [PHONE]: sizeStyle(SIZE.small) }),
      ...(largeSize && { ...sizeStyle(SIZE.large), [PHONE]: sizeStyle(SIZE.medium) }),
      ...(xlSize && {
        minHeight: 56,
        paddingLeft: 24,
        paddingRight: 24,
        borderRadius: 12,
        [PHONE]: sizeStyle(SIZE.large),
      }),
    }

    return [defaultStyle, ...colorStyle, disabledState, size]
  }

  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ ownerState }: { ownerState: ButtonProps }) => rootStyles(ownerState),
      },
    },
  }
}
