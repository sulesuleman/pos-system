import type { SxProps, Theme } from '@mui/material/styles'

// Style/sx objects for StyledRadio. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useRadioStyles() {
  const legend: SxProps<Theme> = {
    mb: 1,
  }

  return { legend }
}
