import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button, { type ButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme, type Breakpoint, type Theme } from '@mui/material/styles'
import { StyledIconButton } from '../StyledIconButton'
import { useStyledButtonStyles } from './useStyledButtonStyles'

export type StyledButtonProps = ButtonProps & {
  children: ReactNode
  mt?: number
  /** Only reaches the button once it's collapsed to its icon by `responsiveIcon` - same as the
   * reference, which never wraps its own full (label-and-icon) button in a Tooltip either. */
  tooltip?: string
  /** Collapses to just its icon (via StyledIconButton) below `responsiveIconBreakpoint`. */
  responsiveIcon?: boolean
  /** Width below which `responsiveIcon` collapses the button to its icon. Defaults to 'sm',
   * matching the reference's own default. */
  responsiveIconBreakpoint?: Breakpoint
  loading?: boolean
}

const COLOR_KEYS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const
type ColorKey = (typeof COLOR_KEYS)[number]

function isColorKey(value: unknown): value is ColorKey {
  return typeof value === 'string' && (COLOR_KEYS as readonly string[]).includes(value)
}

// Contained buttons use contrast text on their own colour; outlined/text buttons use the
// colour's `main` instead - same distinction the reference's own getSpinnerColor draws.
function getSpinnerColor(theme: Theme, variant: ButtonProps['variant'], color: ButtonProps['color']): string {
  if (variant === 'contained') {
    return isColorKey(color) ? theme.palette[color].contrastText : theme.palette.primary.contrastText
  }
  return isColorKey(color) ? theme.palette[color].main : theme.palette.primary.main
}

// A Button with a built-in loading spinner (replaces the label in place, keeping the button's
// own width) and an optional responsive-icon mode that collapses to a StyledIconButton below a
// given breakpoint. Ported from the reference app's own SButton
// (AccessAndControl.Frontend's buttons/SButton.tsx).
export function StyledButton({
  mt = 0,
  variant = 'contained',
  fullWidth = false,
  tooltip,
  responsiveIcon = false,
  responsiveIconBreakpoint = 'sm',
  loading = false,
  size,
  color,
  disabled,
  startIcon,
  endIcon,
  children,
  sx,
  ...rest
}: StyledButtonProps) {
  const theme = useTheme()
  const isIconOnly = useMediaQuery(theme.breakpoints.down(responsiveIconBreakpoint))
  const styles = useStyledButtonStyles({ loading, mt })

  // Below `tablet` the theme already draws every button one size down (see button.tsx), and
  // coarse pointers get their own larger hit area from CssBaseline - the size is passed through
  // as given, same as the reference.
  const spinnerSize = size === 'small' ? 16 : size === 'large' ? 24 : 20
  const spinnerColor = getSpinnerColor(theme, variant, color)

  if (responsiveIcon && isIconOnly) {
    return (
      <StyledIconButton
        colorVariant={color === 'inherit' ? 'inherit' : isColorKey(color) ? color : 'primary'}
        size="small"
        disabled={disabled || loading}
        title={tooltip}
        {...rest}
      >
        {loading ? <CircularProgress size={16} sx={{ color: spinnerColor }} /> : startIcon || endIcon}
      </StyledIconButton>
    )
  }

  // Only a plain object `sx` is merged (an array or function form isn't used by any caller
  // today) - same simplifying assumption StyledIconButton makes.
  const sxObject = sx != null && typeof sx === 'object' && !Array.isArray(sx) ? sx : undefined

  return (
    <Button
      {...rest}
      variant={variant}
      color={color}
      fullWidth={fullWidth}
      size={size}
      disabled={disabled || loading}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{ ...styles.root, ...sxObject, whiteSpace: 'nowrap' }}
    >
      <Box sx={styles.content}>{children}</Box>
      {loading && <CircularProgress size={spinnerSize} sx={{ ...styles.spinner(spinnerSize), color: spinnerColor }} />}
    </Button>
  )
}
