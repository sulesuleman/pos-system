import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import { HEADER_HEIGHT } from '../constants'

// Style/sx objects for Header. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
//
// `scrolled`: the header blends into the page at rest (same canvas color, no border/shadow) and
// only picks up definition - a blurred backdrop and a faint bottom border - once content has
// actually scrolled underneath it.
export function useHeaderStyles({ scrolled }: { scrolled: boolean }) {
  const theme = useTheme()

  const root: SxProps<Theme> = {
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar,
    minHeight: { xs: 56, tablet: HEADER_HEIGHT },
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: { xs: 1, tablet: 1.5 },
    px: { xs: 1.5, tablet: 2, laptop: 3 },
    py: { xs: 1, tablet: 1.5 },
    transition: theme.transitions.create(['background-color', 'border-color', 'backdrop-filter'], {
      duration: theme.transitions.duration.shortest,
    }),
    ...(scrolled
      ? {
          backgroundColor: theme.palette.components.paper.bgBlur,
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }
      : {
          backgroundColor: 'background.background',
          borderBottom: '1px solid transparent',
        }),
  }

  const leading: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: { xs: 1, tablet: 1.5 },
    minWidth: 0,
    // Takes whatever room `rightContent` doesn't, so it stays pinned right regardless of how
    // long the heading is.
    flex: '1 1 auto',
  }

  // Right-aligned, page-specific action button(s) - every screen can have different ones, same
  // as its icon. Pushed to the end of the (wrapping) header row rather than the end of
  // `leading`, so a long heading can't crowd it out. Below `tablet` there usually isn't room for
  // both the heading and its actions on one line, so instead of cramming (`ml: auto` squeezing
  // against a wrapped heading) it drops onto its own full-width row, right-aligned, the same way
  // `tabsRow` already does.
  const rightContent: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: { xs: 1, tablet: 1.5 },
    flexShrink: 0,
    ml: { xs: 0, tablet: 'auto' },
    [theme.breakpoints.down('tablet')]: {
      flexBasis: '100%',
      justifyContent: 'flex-end',
      mt: 0.5,
    },
  }

  // A full-width row of its own below the heading/rightContent row - `root`'s own `flexWrap`
  // puts it on the next line without needing a separate wrapping Box.
  const tabsRow: SxProps<Theme> = {
    flexBasis: '100%',
    mt: 0.5,
  }

  // The page's own icon (or, with `onBack`, a back button instead) in a tinted square - the
  // same subtle-accent language as a sidebar nav item's active state. Sized to match the
  // reference app's page-header tile (PageLayout.tsx's `inset.tile`/glyph sizes).
  const iconBadge: SxProps<Theme> = {
    width: { xs: 36, tablet: 44 },
    height: { xs: 36, tablet: 44 },
    flexShrink: 0,
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'primary.main',
    bgcolor: theme.palette.primary.shades[8],
    '& svg': { fontSize: { xs: 18, tablet: 22 } },
  }

  // The back button is the same tile, but interactive - the reference's own back/left-icon tile
  // also carries a border plus hover/focus-visible states (there in white-on-gradient; adapted
  // here to this app's primary-tint palette instead), which the purely decorative icon doesn't
  // need.
  const backIconBadge: SxProps<Theme> = {
    ...iconBadge,
    p: 0,
    border: `1px solid ${theme.palette.primary.shades[16]}`,
    '& svg': { fontSize: { xs: 20, tablet: 24 } },
    '&:hover': { bgcolor: theme.palette.primary.shades[16] },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  }

  const textBlock: SxProps<Theme> = {
    minWidth: 0,
  }

  const breadcrumbs: SxProps<Theme> = {
    mb: 0.25,
    minWidth: 0,
    '& .MuiBreadcrumbs-separator': { mx: 0.5 },
    // A long trail scrolls off rather than wrapping onto a second line below `tablet`, where
    // there's no room to spare.
    [theme.breakpoints.down('tablet')]: {
      '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
      '& .MuiBreadcrumbs-li': { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    },
  }

  return { root, leading, rightContent, tabsRow, iconBadge, backIconBadge, textBlock, breadcrumbs }
}
