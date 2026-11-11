import type { Theme } from '@mui/material/styles'
import type { RadioProps } from '@mui/material/Radio'

// ----------------------------------------------------------------------

export function radio(theme: Theme) {
  return {
    // CHECKBOX, RADIO, SWITCH
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          ...theme.typography.body2,
        },
      },
    },

    // 8px padding, 20/24 icon; a phone (below `tablet`) draws a medium radio as a small one
    MuiRadio: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: RadioProps }) => {
          const small = ownerState.size === 'small'
          const icon = small ? 20 : 24
          return {
            padding: theme.spacing(1),
            '& svg': {
              width: icon,
              height: icon,
            },
            ...(!small && {
              [theme.breakpoints.down('tablet')]: {
                '& svg': { width: 20, height: 20 },
              },
            }),
          }
        },
      },
    },
  }
}
