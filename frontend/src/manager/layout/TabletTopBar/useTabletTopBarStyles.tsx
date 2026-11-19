import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { TABLET_TOPBAR_HEIGHT } from '../constants'

// Style/sx objects for TabletTopBar. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useTabletTopBarStyles() {
  const theme = useTheme()
  const white = theme.palette.common.white

  // The gradient field, same surface the rail itself sits on - ported from the reference's own
  // TabletTopBar (`ui/layout/TabletTopBar.tsx`), shown only `tablet` to `lg` (reference's
  // 768-1199, mapped onto this app's own breakpoint names).
  const root: SxProps<Theme> = {
    display: { xs: 'none', tablet: 'flex', lg: 'none' },
    alignItems: 'center',
    gap: 1.5,
    flexShrink: 0,
    minHeight: TABLET_TOPBAR_HEIGHT,
    px: 2,
    pt: 'env(safe-area-inset-top)',
    color: white,
    background: theme.palette.gradients.field,
    backgroundAttachment: 'fixed',
  }

  const title: SxProps<Theme> = {
    flex: 1,
    minWidth: 0,
  }

  const menuButton: SxProps<Theme> = {
    color: white,
    '&:hover': { bgcolor: alpha(white, 0.08) },
    '&.Mui-focusVisible, &:focus-visible': { outline: `2px solid ${white}`, outlineOffset: 2 },
  }

  return { root, title, menuButton }
}
