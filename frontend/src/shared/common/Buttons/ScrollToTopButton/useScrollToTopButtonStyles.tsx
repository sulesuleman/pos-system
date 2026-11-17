import { useTheme, type SxProps, type Theme } from '@mui/material/styles'

// Style/sx objects for ScrollToTopButton. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useScrollToTopButtonStyles({ visible }: { visible: boolean }) {
  const theme = useTheme()

  const root: SxProps<Theme> = {
    position: 'fixed',
    right: { xs: 16, laptop: 24 },
    bottom: { xs: 16, laptop: 24 },
    zIndex: theme.zIndex.speedDial,
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.8)',
    pointerEvents: visible ? 'auto' : 'none',
    transition: theme.transitions.create(['opacity', 'transform'], {
      duration: theme.transitions.duration.shorter,
    }),
    boxShadow: theme.customShadows.z8,
  }

  return { root }
}
