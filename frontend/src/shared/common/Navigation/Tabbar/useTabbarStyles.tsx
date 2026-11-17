import { type SxProps, type Theme } from '@mui/material/styles'

// Style/sx objects for Tabbar. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useTabbarStyles() {
  const root: SxProps<Theme> = {
    minHeight: 40,
  }

  const tab: SxProps<Theme> = {
    minHeight: 40,
    minWidth: 0,
    px: 1.5,
    textTransform: 'none',
    fontWeight: 500,
  }

  return { root, tab }
}
