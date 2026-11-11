import type { Theme } from '@mui/material/styles'
import { sliderClasses } from '@mui/material/Slider'

// ----------------------------------------------------------------------

export function slider(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'

  return {
    MuiSlider: {
      styleOverrides: {
        root: {
          [`&.${sliderClasses.disabled}`]: {
            color: theme.palette.action.disabled,
          },
        },
        rail: {},
        markLabel: {
          fontSize: 13,
          color: theme.palette.text.disabled,
        },
        valueLabel: {
          borderRadius: 8,
          backgroundColor: theme.palette.grey[lightMode ? 800 : 700],
        },
      },
    },
  }
}
