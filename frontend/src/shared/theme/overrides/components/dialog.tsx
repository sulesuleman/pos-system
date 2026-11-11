import type { Theme } from '@mui/material/styles'
import type { DialogProps } from '@mui/material/Dialog'

// ----------------------------------------------------------------------

export function dialog(theme: Theme) {
  return {
    // A dialog or drawer does not lock the page's scroll: locking hides the scrollbar and the
    // page jumps sideways by its width each time one opens. The scrim keeps the pointer off.
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    // Popover hands its own scroll lock to Modal, so the MuiModal default never reaches a menu
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ ownerState }: { ownerState: DialogProps }) => ({
          boxShadow: theme.customShadows.dialog,
          borderRadius: 12,
          ...(!ownerState.fullScreen && {
            margin: theme.spacing(2),
          }),
        }),
        paperFullScreen: {
          borderRadius: 0,
        },
      },
    },
    MuiDialogTitle: {
      defaultProps: {
        variant: 'h6',
      },
      styleOverrides: {
        root: {
          padding: '24px 12px 24px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(0, 3),
        },
        dividers: {
          paddingTop: theme.spacing(3),
          paddingBottom: theme.spacing(3),
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
          gap: 12,
          '& > :not(:first-of-type)': {
            marginLeft: 0,
          },
        },
      },
    },
    // Every modal scrim; `invisible` (menus, popovers) stays clear
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.components.backdrop,
        },
        invisible: {
          backgroundColor: 'transparent',
        },
      },
    },
  }
}
