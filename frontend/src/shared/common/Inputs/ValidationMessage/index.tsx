import FormHelperText from '@mui/material/FormHelperText'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useValidationMessageStyles } from './useValidationMessageStyles'

export type ValidationMessageProps = {
  error?: string
}

// A single-line validation message - an icon beside the error text, shown only when there is an
// error to show. Its own shared component since every input in this app (StyledCheckbox,
// StyledRadio, and anything built on top of them) needs the same treatment rather than each one
// re-drawing it inline.
export function ValidationMessage({ error }: ValidationMessageProps) {
  const styles = useValidationMessageStyles()

  if (!error) {
    return null
  }

  return (
    <FormHelperText error sx={styles.root}>
      <WarningAmberIcon sx={styles.icon} />
      {error}
    </FormHelperText>
  )
}
