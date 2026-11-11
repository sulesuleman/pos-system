import type { Theme } from '@mui/material/styles'
import { tabClasses } from '@mui/material/Tab'

// Plain text tabs over an indicator.
export function tabs(theme: Theme) {
  const H = 48
  return {
    MuiTabs: {
      // Scrollable, with MUI's own arrows, so a row that outruns its width is still reachable on
      // a phone. A row that sets its own variant (fullWidth) keeps it.
      defaultProps: {
        textColor: 'inherit',
        variant: 'scrollable',
        allowScrollButtonsMobile: true,
      },
      styleOverrides: {
        root: { minHeight: H },
        // 40 between tabs, 24 on a phone
        list: {
          gap: 24,
          [theme.breakpoints.up('sm')]: {
            gap: 40,
          },
        },
        // the current tab is marked in the text colour, not a brand colour
        indicator: {
          backgroundColor: theme.palette.text.primary,
        },
        // an arrow with nowhere to scroll takes no room, so the first tab starts at the edge (it
        // appears once there is more to that side)
        scrollButtons: {
          '&.Mui-disabled': { width: 0, overflow: 'hidden' },
        },
      },
    },

    MuiTab: {
      defaultProps: {
        disableRipple: true,
        iconPosition: 'start',
      },
      styleOverrides: {
        root: {
          ...theme.typography.subtitle2,
          minHeight: H,
          minWidth: 48,
          gap: 8,
          padding: 0,
          textTransform: 'none',
          opacity: 1,
          // idle tabs step back to secondary; the current one is primary
          color: theme.palette.text.secondary,

          [`& > .${tabClasses.icon}`]: {
            margin: 0,
          },

          [`&.${tabClasses.selected}`]: {
            color: theme.palette.text.primary,
          },
        },
      },
    },
  }
}
