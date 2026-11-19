import type { SxProps, Theme } from '@mui/material/styles'

// Style/sx objects for Logo. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useLogoStyles({ size }: { size: number }) {
  const root: SxProps<Theme> = {
    width: size,
    height: size,
    flexShrink: 0,
    bgcolor: 'common.white',
    '& img': { objectFit: 'contain', p: 0.75 },
  }

  return { root }
}
