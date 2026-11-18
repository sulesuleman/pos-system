import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'

export type StyledIconButtonColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit'

// Style/sx objects for StyledIconButton. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useStyledIconButtonStyles({
  colorVariant,
  showBackground,
  alphaValue,
  hasCustomBackgroundColor,
}: {
  colorVariant: StyledIconButtonColor
  showBackground: boolean
  alphaValue: number
  /** True once the caller's own `sx` already sets a `backgroundColor` - this button then leaves
   * the background (and its hover/focus tint, which would otherwise clash with it) alone. */
  hasCustomBackgroundColor: boolean
}) {
  const theme = useTheme()

  // The soft wash this button reads by: `main` tinted behind an icon in its `dark` step, rather
  // than MUI's own flat `color` prop - ported from the reference app's own SIconButton
  // (AccessAndControl.Frontend's buttons/SIconButton.tsx). `inherit` has no palette entry of its
  // own there either, so it falls back to the same grey wash/`text.secondary` pairing the
  // reference uses for its own "no variant matched" case.
  const mainColor = colorVariant === 'inherit' ? theme.palette.grey['500Transparent'][8] : theme.palette[colorVariant].main
  const iconColor = colorVariant === 'inherit' ? theme.palette.text.secondary : theme.palette[colorVariant].dark

  const root: SxProps<Theme> = {
    color: iconColor,
    ...(!hasCustomBackgroundColor && {
      backgroundColor: showBackground ? alpha(mainColor, alphaValue) : 'transparent',
      '&:hover': { backgroundColor: alpha(mainColor, alphaValue + 0.04) },
      '&:focus': { backgroundColor: alpha(mainColor, alphaValue + 0.04) },
    }),
  }

  return { root }
}
