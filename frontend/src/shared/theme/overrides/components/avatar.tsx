import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function avatar(theme: Theme) {
  return {
    MuiAvatar: {
      styleOverrides: {
        root: {
          ...theme.typography.subtitle2,
        },
        colorDefault: {
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.grey['500Transparent'][24],
        },
        rounded: {
          borderRadius: 10,
        },
        // fit, never fill: a logo cropped to a square loses its shape
        img: {
          objectFit: 'contain',
        },
      },
    },
  }
}
