import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------
// Styling for MUI X's date/time pickers (`@mui/x-date-pickers`). That package is not a
// dependency of this app, so these overrides have no effect until/unless it is added.
//
// The reference theme this was adapted from also swapped in a custom icon set (a third-party
// icon package) for the picker's open/arrow/switch-view icons. That icon package is unrelated to
// MUI, heavy, and has no other use in this app, so those icon-slot defaults were dropped rather
// than ported - only the plain style overrides are kept.
// ----------------------------------------------------------------------

export function datePicker(theme: Theme) {
  return {
    MuiPickersArrowSwitcher: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: 'none',
          '& .MuiIconButton-root:first-of-type': {
            border: '1px solid transparent',
          },
          '& .MuiIconButton-root:last-of-type': {
            border: '1px solid transparent',
          },
        },
      },
    },
    MuiClock: {
      styleOverrides: {
        root: {
          justifyContent: 'center',
          marginTop: theme.spacing(6),
        },
      },
    },
    MuiDateTimePickerToolbar: {
      styleOverrides: {
        separator: {
          lineHeight: 1.2,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          '.MuiPickersLayout-root &': {
            display: 'flex',
            width: '100%',
            '& > .MuiButton-root': {
              flex: '1 1 0',
            },
            '& > .MuiButton-root:first-of-type': {
              backgroundColor: 'transparent',
            },
            '& > .MuiButton-root:last-of-type': {
              color: theme.palette.primary.contrastText,
            },
          },
        },
      },
    },
    MuiPickersTabs: {
      styleOverrides: {
        root: {
          '& .MuiTab-root.Mui-selected': {
            color: theme.palette.common.black,
          },
        },
      },
    },
  }
}
