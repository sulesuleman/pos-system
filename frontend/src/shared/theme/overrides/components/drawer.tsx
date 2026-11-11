import type { Theme } from '@mui/material/styles'
import type { DrawerProps } from '@mui/material/Drawer'

// ----------------------------------------------------------------------

export function drawer(theme: Theme) {
  /* A translucent, blurred sheet: white at 92% in light mode, and the dark paper at 90% in dark
     mode - a white sheet there would read as a light panel over a dark page. */
  const sheet = {
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.components.paper.bgBlur : theme.palette.common.whiteTransparent92,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // Safari support
  }

  return {
    MuiDrawer: {
      styleOverrides: {
        paper: ({ ownerState }: { ownerState: DrawerProps }) => ({
          ...sheet,
          border: `1px solid ${theme.palette.divider}`,
          zIndex: theme.zIndex.drawer,
          '&.MuiDrawer-paperAnchorLeft, &.MuiDrawer-paperAnchorRight': sheet,
          '&.MuiDrawer-paperAnchorTop, &.MuiDrawer-paperAnchorBottom': sheet,
          ...((ownerState.variant === 'temporary' ||
            ownerState.variant === 'persistent' ||
            ownerState.variant === 'permanent') &&
            sheet),
        }),
      },
    },
    // The scrim is the global MuiBackdrop (dialog.tsx), the same for drawers and dialogs
  }
}
