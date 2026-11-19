import { Children, isValidElement, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useInputFieldStyles } from './useInputFieldStyles'

export type InputFieldProps = TextFieldProps

// A themed, decoupled text-input wrapper around MUI's TextField: props in, UI out. Carries no
// page- or feature-specific copy or logic, so it is usable from any screen in either entry point.
//
// Three standing conventions live here so every field gets them for free:
// - A required field reads "<Label> (required)" instead of MUI's default asterisk.
// - The label is always shown shrunk/floating, so a `placeholder` stays visible in the field at
//   the same time instead of being hidden behind the resting label.
// - A `select` field's `placeholder` (MUI's own Select ignores the native `placeholder`
//   attribute) shows the same way while nothing is chosen, via `displayEmpty`/`renderValue` -
//   once a value is chosen, this just re-renders the matching MenuItem's own label, the same
//   text Select would show by default without a custom renderValue.
export function InputField({ sx, label, required, slotProps, placeholder, children, ...props }: InputFieldProps) {
  const styles = useInputFieldStyles()
  const sxArray = Array.isArray(sx) ? sx : sx ? [sx] : []
  const displayLabel = required && typeof label === 'string' ? `${label} (required)` : label
  const isSelectWithPlaceholder = props.select === true && typeof placeholder === 'string'

  return (
    <TextField
      fullWidth
      {...props}
      placeholder={props.select === true ? undefined : placeholder}
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
        select: isSelectWithPlaceholder
          ? {
              displayEmpty: true,
              renderValue: (selected: unknown) => {
                if (selected === '' || selected === undefined || selected === null) {
                  return (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {placeholder}
                    </Box>
                  )
                }
                const matchedOption = Children.toArray(children).find(
                  (child) => isValidElement(child) && (child.props as { value?: unknown }).value === selected,
                )
                return isValidElement(matchedOption) ? (matchedOption.props as { children?: ReactNode }).children : String(selected)
              },
              ...(slotProps?.select as Record<string, unknown> | undefined),
            }
          : (slotProps?.select as Record<string, unknown> | undefined),
      }}
      sx={[styles.root, ...sxArray]}
    >
      {children}
    </TextField>
  )
}
