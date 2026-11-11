import { alpha, type Theme } from '@mui/material/styles'
import { autocompleteClasses } from '@mui/material/Autocomplete'
import { svgIconClasses } from '@mui/material/SvgIcon'
import { paper, menuItem } from '../../css'

// ----------------------------------------------------------------------

export function autocomplete(theme: Theme) {
  return {
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          [`& span.${autocompleteClasses.tag}`]: {
            ...theme.typography.subtitle2,
            height: 24,
            minWidth: 24,
            lineHeight: '24px',
            textAlign: 'center',
            padding: theme.spacing(0, 0.75),
            color: theme.palette.text.secondary,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: alpha(theme.palette.grey[500], 0.16),
          },
        },
        // the menu's paper, with the 4px padding and gap on the list itself
        paper: {
          ...paper({ theme, dropdown: true }),
          padding: 0,
        },
        listbox: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 4,
          [`& .${autocompleteClasses.option}`]: {
            ...menuItem(theme),
          },
        },
        popupIndicator: {
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          width: 32,
          height: 32,
          '&:hover': {
            border: 'none',
            backgroundColor: 'transparent',
          },
        },
        clearIndicator: {
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          '&:hover': {
            border: 'none',
            backgroundColor: 'transparent',
          },
        },
        endAdornment: {
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          [`& .${svgIconClasses.root}`]: {
            width: 18,
            height: 18,
          },
        },
      },
    },
  }
}
