import { type Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function paper(theme: Theme) {
  return {
    MuiPaper: {
      // surfaces are flat by default; cards, menus and dialogs carry their own named shadows
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: theme.palette.components.paper.outlined,
        },
      },
    },
  }
}
