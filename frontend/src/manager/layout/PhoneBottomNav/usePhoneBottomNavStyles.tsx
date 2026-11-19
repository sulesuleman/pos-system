import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { BOTTOM_NAV_HEIGHT } from '../constants'

// Style/sx objects for PhoneBottomNav. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function usePhoneBottomNavStyles() {
  const theme = useTheme()

  // Fixed to the viewport, clear of the home indicator - shown only below `tablet`, where the
  // permanent rail and the tablet band's drawer-hamburger both give way to this instead.
  const root: SxProps<Theme> = {
    display: { xs: 'flex', tablet: 'none' },
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: theme.zIndex.appBar,
    height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
    pb: 'env(safe-area-inset-bottom)',
    px: 'max(4px, env(safe-area-inset-left))',
    bgcolor: 'background.paper',
    borderTop: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.customShadows.dropdown,
  }

  // Equal-width items; a long label is cut with an ellipsis rather than wrapped or shrinking the
  // icon.
  const item: SxProps<Theme> = {
    flex: '1 1 0',
    minWidth: 0,
    maxWidth: 'none',
    gap: 0.5,
    px: 0.5,
    py: 0,
    color: 'text.secondary',
    '& .MuiBottomNavigationAction-label': {
      ...theme.typography.caption,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    '&.Mui-selected': {
      color: 'primary.main',
      '& .MuiBottomNavigationAction-label': { fontWeight: 600 },
    },
    '&.Mui-focusVisible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  }

  return { root, item }
}
