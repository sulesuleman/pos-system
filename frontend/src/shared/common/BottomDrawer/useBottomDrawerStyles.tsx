import { useTheme, type SxProps, type Theme } from '@mui/material/styles'

// Style/sx objects for BottomDrawer. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useBottomDrawerStyles() {
  const theme = useTheme()

  // Beats the theme's own MuiDrawer override (shared/theme/overrides/components/drawer.tsx),
  // which gives every drawer a translucent, blurred paper via a `&.MuiDrawer-paperAnchorBottom`
  // selector - right for a nav-style side drawer, wrong for a sheet, which needs to read as a
  // solid surface. Matching that selector's shape is what it takes to beat it.
  const solidPaper = {
    backgroundColor: theme.palette.background.paper,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  }

  const paper: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    // Lifted above the on-screen keyboard (--kb, written by useKeyboardInset) and the home
    // indicator / notch.
    paddingBottom: 'env(safe-area-inset-bottom)',
    marginBottom: 'var(--kb, 0px)',
    '&, &.MuiDrawer-paperAnchorBottom': solidPaper,
  }

  const handleWrapper: SxProps<Theme> = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    pt: 1.5,
    pb: 1,
  }

  const handle: SxProps<Theme> = {
    width: 40,
    height: 4,
    backgroundColor: theme.palette.grey[400],
    borderRadius: 2,
  }

  const header: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 2,
    px: { xs: 1.5, sm: 3 },
    pb: 2,
    minWidth: 0,
  }

  const headerText: SxProps<Theme> = {
    minWidth: 0,
  }

  const headerTitle: SxProps<Theme> = {
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
  }

  const headerDescription: SxProps<Theme> = {
    mt: 0.25,
    color: theme.palette.text.secondary,
  }

  const content: SxProps<Theme> = {
    px: { xs: 1.5, sm: 3 },
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    WebkitOverflowScrolling: 'touch',
  }

  // The strong (last) action takes the full width on top, the rest share the row under it
  // equally; margins are cleared so an `mr: 'auto'` action can't push its neighbour off the row.
  const footer: SxProps<Theme> = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    px: { xs: 1.5, sm: 3 },
    pt: 1,
    pb: 1.5,
    '& > *': { flex: '1 1 0', minWidth: 0, mx: '0 !important' },
    '& > :last-child': { order: -1, flexBasis: '100%' },
  }

  return {
    paper,
    handleWrapper,
    handle,
    header,
    headerText,
    headerTitle,
    headerDescription,
    content,
    footer,
  }
}
