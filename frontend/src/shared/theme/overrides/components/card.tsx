import '@mui/material/Card'
import type { Theme } from '@mui/material/styles'

declare module '@mui/material/Card' {
  interface CardPropsVariantOverrides {
    soft: true
  }
}

export function card(theme: Theme) {
  return {
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          // `customShadows.card` is already none in dark mode; none on a phone (below `tablet`) either
          boxShadow: theme.customShadows.card,
          [theme.breakpoints.down('tablet')]: { boxShadow: 'none' },
          borderRadius: 20,
          zIndex: 0, // Fix Safari overflow: hidden with border radius
          // clip, not hidden: the corners still cut what is inside, but the card is no scroll
          // box, so a table head or section header in it can pin to the page while it scrolls
          overflow: 'clip',
        },
      },
    },
    MuiCardHeader: {
      defaultProps: {
        slotProps: {
          title: { variant: 'h6' },
          subheader: { variant: 'body2' },
        },
      },
      styleOverrides: {
        root: {
          gap: 16,
          padding: '24px 16px 0 24px',
        },
        avatar: {
          marginRight: 0,
        },
        action: {
          margin: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },
  }
}
