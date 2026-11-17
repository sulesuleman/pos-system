import { useTheme, type SxProps, type Theme } from '@mui/material/styles'

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

  // No distinct card surface or width cap here (deliberately, per this app's own direction) -
  // content sits directly on the canvas, full width, growing to at least fill the container so
  // a short page doesn't look like it's floating in a half-empty scroll area.
  const panel: SxProps<Theme> = {
    position: 'relative',
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column',
    p: { xs: 2, laptop: 3 },
  }

  return { container, panel }
}
