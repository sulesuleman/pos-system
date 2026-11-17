import { useTheme, type SxProps, type Theme } from '@mui/material/styles'

// Style/sx objects for StyledDialog. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
//
// Deliberately small: the theme's own MuiDialog/MuiDialogTitle/MuiDialogContent/MuiDialogActions
// overrides (shared/theme/overrides/components/dialog.tsx) already supply the paper radius/
// shadow and the title/content/actions padding - this only adds what they don't: the fullHeight
// variant and the icon/title/description header layout.
export function useStyledDialogStyles() {
  const theme = useTheme()

  const paperFullHeight: SxProps<Theme> = {
    height: '90dvh',
    maxHeight: '90dvh',
    display: 'flex',
    flexDirection: 'column',
  }

  const titleRow: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  }

  const titleRowWithDescription: SxProps<Theme> = {
    alignItems: 'flex-start',
  }

  const titleError: SxProps<Theme> = {
    color: theme.palette.error.main,
  }

  const titleBlock: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    minWidth: 0,
  }

  const titleBlockWithDescription: SxProps<Theme> = {
    alignItems: 'flex-start',
    gap: 2,
  }

  const titleText: SxProps<Theme> = {
    minWidth: 0,
  }

  const titleHeading: SxProps<Theme> = {
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
  }

  const titleDescription: SxProps<Theme> = {
    mt: 0.25,
    color: theme.palette.text.secondary,
  }

  const closeButtonRow: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  }

  const content: SxProps<Theme> = {
    py: 1.5,
  }

  const contentNoActions: SxProps<Theme> = {
    pb: 2,
  }

  return {
    paperFullHeight,
    titleRow,
    titleRowWithDescription,
    titleError,
    titleBlock,
    titleBlockWithDescription,
    titleText,
    titleHeading,
    titleDescription,
    closeButtonRow,
    content,
    contentNoActions,
  }
}
