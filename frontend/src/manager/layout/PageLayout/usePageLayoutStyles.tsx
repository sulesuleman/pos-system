import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { BOTTOM_NAV_HEIGHT, PAGE_HERO_HEIGHT, PHONE_LOGO_BAR_HEIGHT } from '../constants'

// Insets ported from the reference app's own PageLayout (AccessAndControl.Frontend's
// ui/components/PageLayout/PageLayout.tsx INSET): the rail's own breakpoint (`lg`, where the
// permanent sidebar appears) gets the wide insets, every narrower band (tablet drawer + phone)
// shares the tighter "mobile" set, same split as the reference's own `isMobileIpadNavigation`.
const INSET = {
  desktop: { heading: 4.5 * 8, panelLeft: 6 * 8, panelRight: 4 * 8, panelBottom: 3 * 8, radius: 64, tile: 60 },
  mobile: { heading: 2 * 8, panelLeft: 2 * 8, panelRight: 2 * 8, panelBottom: 5 * 8, radius: 32, tile: 44 },
}

// Style/sx objects for PageLayout. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function usePageLayoutStyles() {
  const theme = useTheme()
  const white = theme.palette.common.white

  // ONE surface scrolls - this container, not the page/body - so there is one scrollbar and
  // ScrollToTopButton watches it directly. Mirrors the reference app's own
  // `page-layout-container`. Deliberately NO background of its own: the hero sits directly on
  // ManagerShell's gradient field (see useManagerShellStyles' `root`) showing through underneath
  // it - only `panel` below paints the canvas colour. Painting it here instead (as the
  // pre-hero version of this file did, when the container WAS the whole content surface) washes
  // the gradient out under the hero.
  const container: SxProps<Theme> = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    scrollbarColor: `transparent ${theme.palette.background.background}`,
    '&:hover, &:focus-within': {
      scrollbarColor: `${theme.palette.grey['500Transparent'][48]} ${theme.palette.background.background}`,
    },
  }

  // The phone's own logo bar (below `tablet`, where there's no rail and no TabletTopBar) - it
  // scrolls away with the page; the hero under it stays pinned. Ported from the reference's own
  // `page-layout-logo-bar`.
  const logoBar: SxProps<Theme> = {
    display: { xs: 'flex', tablet: 'none' },
    alignItems: 'center',
    minHeight: PHONE_LOGO_BAR_HEIGHT,
    px: 2,
    pt: 'env(safe-area-inset-top)',
    color: white,
    background: theme.palette.gradients.field,
    backgroundAttachment: 'fixed',
  }

  // The gradient hero: pinned to the top of the scroll container as the panel below it (which is
  // in normal flow, not sticky) scrolls up and its rounded top-left corner slides over it - the
  // reference's own `page-layout-heading`. On `lg`+ (the rail) it's a fixed height so the panel
  // lands in the same place on every page; narrower, it's content-sized, and paints its own
  // gradient (pinned to the viewport, not this element, so it keeps lining up with the app's own
  // background while it's repainted mid-scroll).
  const hero = (hasActions: boolean): SxProps<Theme> => ({
    position: 'sticky',
    top: 0,
    zIndex: 0,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    px: { xs: INSET.mobile.heading / 8, lg: INSET.desktop.heading / 8 },
    py: { xs: 2.5, lg: 0 },
    height: { xs: 'auto', lg: PAGE_HERO_HEIGHT },
    [theme.breakpoints.down('tablet')]: {
      zIndex: theme.zIndex.appBar - 1,
      background: theme.palette.gradients.field,
      backgroundAttachment: 'fixed',
      // room for the actions row, which floats fixed above the bottom nav on a phone instead of
      // sitting in flow here
      pb: hasActions ? 7 : 2.5,
    },
  })

  const breadcrumbsRow: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    minHeight: 36,
    mb: 1.25,
    minWidth: 0,
    [theme.breakpoints.down('tablet')]: {
      minHeight: 0,
      height: theme.typography.h6.lineHeight,
      mb: 0.5,
      overflow: 'hidden',
    },
  }

  const breadcrumbs: SxProps<Theme> = {
    minWidth: 0,
    color: alpha(white, 0.48),
    [theme.breakpoints.down('tablet')]: {
      '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
      '& .MuiBreadcrumbs-li': { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    },
  }

  const subheading: SxProps<Theme> = {
    mb: 1.25,
    color: alpha(white, 0.8),
  }

  const titleRow: SxProps<Theme> = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  }

  const title: SxProps<Theme> = {
    flex: 1,
    minWidth: 0,
    color: white,
    [theme.breakpoints.down('tablet')]: { ...theme.typography.h2 },
  }

  // The leading slot: the page's icon, or the way back - a tinted tile on the gradient.
  const tile = (size: number): SxProps<Theme> => ({
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: white,
    bgcolor: alpha(white, 0.08),
    border: `1px solid ${alpha(white, 0.24)}`,
    '& svg': { fontSize: Math.round(size * 0.4) },
  })

  const iconTile: SxProps<Theme> = { ...tile(INSET.mobile.tile), [theme.breakpoints.up('lg')]: tile(INSET.desktop.tile) }
  const backButton: SxProps<Theme> = {
    ...iconTile,
    cursor: 'pointer',
    '&:hover': { bgcolor: alpha(white, 0.24) },
    '&:focus-visible, &.Mui-focusVisible': { outline: `2px solid ${white}`, outlineOffset: 2 },
  }

  // The actions row, right-aligned on the title row on `tablet`+. Below it there usually isn't
  // room for both the heading and its actions on one line, so instead it floats fixed above the
  // bottom nav, centred - rendered once, placed by CSS, so a page's buttons keep their state
  // either way, same as the reference's own `page-layout-right-content`.
  const actionsRow: SxProps<Theme> = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexShrink: 0,
    gap: 1.5,
    // An outlined button has no fill of its own, so directly on the gradient its border/text
    // (primary.main) have poor contrast against the blue field - unlike a contained button,
    // which always carries its own colour. Off the gradient an outlined button needs a surface
    // of its own, same as the reference's own `page-layout-right-content` - but at every
    // breakpoint here, not just below `tablet` like the reference (whose rail-width band never
    // puts this row over anything but the hero's own gradient either).
    '& .MuiButton-outlined, & .MuiButton-outlined:hover': { bgcolor: 'background.paper' },
    [theme.breakpoints.down('tablet')]: {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: `calc(${BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom))`,
      zIndex: theme.zIndex.fab,
      flexWrap: 'nowrap',
      gap: 1,
      maxWidth: 'calc(100vw - 32px)',
      '& .MuiButton-root': { boxShadow: theme.customShadows.dropdown, whiteSpace: 'nowrap' },
    },
  }

  const tabsRow: SxProps<Theme> = {
    mt: { xs: 0.5, tablet: 1.5 },
    width: '100%',
  }

  // The panel fills the room under the hero and grows with its content - no screen-tall minimum,
  // which would make every page scroll by the hero's height. White/canvas surface, rounded on
  // top-left only on `lg`+ (narrower, the panel runs the full window width, where a rounded
  // corner would just look like a stray clipped pixel).
  const panel = (hasActions: boolean): SxProps<Theme> => ({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    flex: '1 0 auto',
    borderTopLeftRadius: { xs: 0, lg: Number(theme.shape.borderRadius) * 2 },
    // The canvas grey: white cards sit on it. Lives here (not on `container`) so the hero above
    // keeps showing the gradient field through its own transparent background.
    bgcolor: 'background.background',
    pt: 3,
    pl: { xs: INSET.mobile.panelLeft / 8, lg: INSET.desktop.panelLeft / 8 },
    pr: { xs: INSET.mobile.panelRight / 8, lg: INSET.desktop.panelRight / 8 },
    pb: { xs: INSET.mobile.panelBottom / 8, lg: INSET.desktop.panelBottom / 8 },
    [theme.breakpoints.down('tablet')]: {
      pb: hasActions
        ? `calc(${theme.spacing(INSET.mobile.panelBottom / 8)} + 64px)`
        : theme.spacing(INSET.mobile.panelBottom / 8),
    },
  })

  const content: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    maxWidth: { xs: '100%', xxl: 1788, uhd: 3500 },
    mx: 'auto',
  }

  return {
    container,
    logoBar,
    hero,
    breadcrumbsRow,
    breadcrumbs,
    subheading,
    titleRow,
    title,
    iconTile,
    backButton,
    actionsRow,
    tabsRow,
    panel,
    content,
  }
}
