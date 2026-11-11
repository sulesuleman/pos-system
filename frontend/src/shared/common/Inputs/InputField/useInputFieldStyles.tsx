import { useTheme } from '@mui/material/styles'

// Style/sx objects for InputField. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useInputFieldStyles() {
  const theme = useTheme()

  return {
    root: {
      '& .MuiFilledInput-root': {
        transition: theme.transitions.create(['background-color', 'outline-color'], {
          duration: theme.transitions.duration.shortest,
        }),
      },
    },
  }
}
