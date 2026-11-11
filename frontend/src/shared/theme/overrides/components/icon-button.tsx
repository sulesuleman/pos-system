import type { Theme } from '@mui/material/styles'

declare module '@mui/material/IconButton' {
  interface IconButtonPropsSizeOverrides {
    xs: true
  }
}

// Icon buttons are round.
const SIZE = {
  large: { box: 48, icon: 32 },
  medium: { box: 40, icon: 24 },
  small: { box: 36, icon: 20 },
}

const size = (s: { box: number; icon: number }) => ({
  width: s.box,
  height: s.box,
  padding: 0,
  fontSize: s.icon,
})

export function iconButton(theme: Theme) {
  // a phone (below `tablet`) draws each size as the next one down; small stays small
  const phone = (s: { box: number; icon: number }) => ({
    [theme.breakpoints.down('tablet')]: {
      width: s.box,
      height: s.box,
      fontSize: s.icon,
    },
  })

  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '50%',
        },
        sizeLarge: { ...size(SIZE.large), ...phone(SIZE.medium) },
        sizeMedium: { ...size(SIZE.medium), ...phone(SIZE.small) },
        sizeSmall: size(SIZE.small),
        sizeXs: size({ box: 28, icon: 18 }),
      },
    },
  }
}
