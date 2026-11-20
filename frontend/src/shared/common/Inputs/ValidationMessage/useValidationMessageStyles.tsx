import type { SxProps, Theme } from '@mui/material/styles'

// Style/sx objects for ValidationMessage. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useValidationMessageStyles() {
  // The theme's own MuiFormHelperText override (shared/theme/overrides/components/textField.tsx)
  // already supplies the flex row, gap and error colour - this only removes the text-field-sized
  // left padding, which has nothing to align with under a checkbox or radio group.
  const root: SxProps<Theme> = {
    pl: 0,
  }

  const icon: SxProps<Theme> = {
    fontSize: 16,
  }

  return { root, icon }
}
