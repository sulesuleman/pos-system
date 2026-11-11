import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useInputFieldStyles } from './useInputFieldStyles'

export type InputFieldProps = TextFieldProps

// A themed, decoupled text-input wrapper around MUI's TextField: props in, UI out. Carries no
// page- or feature-specific copy or logic, so it is usable from any screen in either entry point.
//
// Two standing conventions live here so every field gets them for free:
// - A required field reads "<Label> (required)" instead of MUI's default asterisk.
// - The label is always shown shrunk/floating, so a `placeholder` stays visible in the field at
//   the same time instead of being hidden behind the resting label.
export function InputField({ sx, label, required, slotProps, ...props }: InputFieldProps) {
  const styles = useInputFieldStyles()
  const sxArray = Array.isArray(sx) ? sx : sx ? [sx] : []
  const displayLabel = required && typeof label === 'string' ? `${label} (required)` : label

  return (
    <TextField
      fullWidth
      {...props}
      label={displayLabel}
      // MUI's own `required` prop also draws the asterisk on the label; keep the native/aria
      // required-ness on the input itself instead, via slotProps below.
      required={false}
      slotProps={{
        ...slotProps,
        htmlInput: {
          required,
          'aria-required': required,
          ...(slotProps?.htmlInput as Record<string, unknown> | undefined),
        },
        inputLabel: {
          shrink: true,
          ...(slotProps?.inputLabel as Record<string, unknown> | undefined),
        },
      }}
      sx={[styles.root, ...sxArray]}
    />
  )
}
