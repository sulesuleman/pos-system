import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function tooltip(theme: Theme) {
  return {
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        // not on touch: a long press opening a label gets in the way of a tap
        disableTouchListener: true,
      },
      styleOverrides: {
        tooltip: {
          ...theme.typography.caption,
          fontWeight: theme.typography.fontWeightMedium,
          padding: '3px 6px',
          borderRadius: 5,
          color: theme.palette.components.tooltip.color,
          backgroundColor: theme.palette.components.tooltip.bg,
        },
        arrow: {
          color: theme.palette.components.tooltip.bg,
        },
      },
    },
  }
}
