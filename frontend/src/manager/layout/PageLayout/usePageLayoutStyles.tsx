import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { BOTTOM_NAV_HEIGHT } from '../constants'

// Style/sx objects for PageLayout. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function usePageLayoutStyles() {
  const theme = useTheme()

  // ONE surface scrolls - this container, not the page/body - so there is one scrollbar, the
  // column header can pin to it (Header is `position: sticky` inside it), and ScrollToTopButton
  // watches it directly. Mirrors the reference app's own `page-layout-container` (PageLayout.tsx).
  const container: SxProps<Theme> = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    // the bar's track is always kept, so content never jumps sideways when it comes or goes
    scrollbarGutter: 'stable',
    bgcolor: 'background.background',
    // the scrollbar reads as the canvas under it, not its own stripe - visible only on hover/focus
    scrollbarColor: `transparent ${theme.palette.background.background}`,
    '&:hover, &:focus-within': {
      scrollbarColor: `${theme.palette.grey['500Transparent'][48]} ${theme.palette.background.background}`,
    },
  }

  // No distinct card surface here (deliberately, per this app's own direction) - content sits
  // directly on the canvas, growing to at least fill the container so a short page doesn't look
  // like it's floating in a half-empty scroll area. It does pick up two structural things the
  // reference app's own panel has that this one was missing: a rounded top-left corner, easing
  // the seam under the sticky Header (laptop+ only - on a phone/tablet the panel runs the full
  // window width, where a rounded corner would just look like a stray clipped pixel), and
  // bottom clearance below `tablet` so content never sits under the fixed BottomNav.
  const panel: SxProps<Theme> = {
    position: 'relative',
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column',
    borderTopLeftRadius: { xs: 0, laptop: Number(theme.shape.borderRadius) * 2 },
    p: { xs: 2, laptop: 3 },
    pb: {
      xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom) + ${theme.spacing(2)})`,
      tablet: 2,
      laptop: 3,
    },
  }

  // The reference app caps very wide pages (`xxl`+) at a fixed content width, centred, rather
  // than letting a 2560px-wide dashboard stretch a card edge-to-edge - this app's own
  // breakpoints already anticipate that (`xxl`/`uhd`, see shared/theme/breakpoints.ts).
  const content: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    maxWidth: { xs: '100%', xxl: 1920 },
    mx: 'auto',
  }

  return { container, panel, content }
}
