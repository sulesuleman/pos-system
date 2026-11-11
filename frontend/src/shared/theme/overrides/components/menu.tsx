import { type Theme } from '@mui/material/styles'
import { menuItem } from '../../css'

// ----------------------------------------------------------------------

// Plain paper on its 8px corner with the dropdown shadow, a 4px padded list with 4px between
// rows, as wide as its content needs.
export function menu(theme: Theme) {
  return {
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: theme.customShadows.dropdown,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        list: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 4,
        },
      },
    },
    MuiMenuList: {
      styleOverrides: {
        root: {
          color: theme.palette.text.primary,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          ...menuItem(theme),
          '& .MuiListItemIcon-root': {
            minWidth: 28,
          },
        },
      },
    },
  }
}
