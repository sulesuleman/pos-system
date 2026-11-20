import { Children, isValidElement, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { ValidationMessage } from '../ValidationMessage'
import { useInputFieldStyles } from './useInputFieldStyles'

export type InputFieldProps = TextFieldProps & {
  /** A static or clickable icon shown at the field's end. Ignored on a `type="password"` field,
   * which already uses that slot for its own show/hide toggle. */
  endIcon?: ReactNode
  /** Makes `endIcon` clickable. Omitted, `endIcon` renders as plain decoration instead. */
  onEndIconClick?: () => void
}

// A themed, decoupled text-input wrapper around MUI's TextField: props in, UI out. Carries no
// page- or feature-specific copy or logic, so it is usable from any screen in either entry point.
//
// Standing conventions live here so every field gets them for free:
// - A required field reads "<Label> (required)" instead of MUI's default asterisk.
// - The label is always shown shrunk/floating, so a `placeholder` stays visible in the field at
//   the same time instead of being hidden behind the resting label.
// - A `select` field's `placeholder` (MUI's own Select ignores the native `placeholder`
//   attribute) shows the same way while nothing is chosen, via `displayEmpty`/`renderValue` -
//   once a value is chosen, this just re-renders the matching MenuItem's own label, the same
//   text Select would show by default without a custom renderValue.
// - A `type="password"` field gets a built-in show/hide toggle for free.
// - When `error` is set, `helperText` is shown via the shared ValidationMessage (an icon beside
//   the text) instead of MUI's own plain helper text - a non-error `helperText` (a hint with no
//   `error`) still renders the plain way, unchanged.
export function InputField({
  sx,
  label,
  required,
  slotProps,
  placeholder,
  children,
  type,
  endIcon,
  onEndIconClick,
  error,
  helperText,
  ...props
}: InputFieldProps) {
  const styles = useInputFieldStyles()
  const [showPassword, setShowPassword] = useState(false)
  const sxArray = Array.isArray(sx) ? sx : sx ? [sx] : []
  const displayLabel = required && typeof label === 'string' ? `${label} (required)` : label
  const isSelectWithPlaceholder = props.select === true && typeof placeholder === 'string'
  const isPasswordField = type === 'password'
  const showValidationMessage = !!error && typeof helperText === 'string'

  return (
    <Box sx={[styles.root, ...sxArray]}>
      <TextField
        fullWidth
        {...props}
        type={isPasswordField && showPassword ? 'text' : type}
        placeholder={props.select === true ? undefined : placeholder}
        label={displayLabel}
        error={error}
        helperText={showValidationMessage ? undefined : helperText}
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
          input: {
            ...(slotProps?.input as Record<string, unknown> | undefined),
            ...((isPasswordField || endIcon) && {
              endAdornment: (
                <InputAdornment position="end">
                  {isPasswordField && (
                    <IconButton onClick={() => setShowPassword((shown) => !shown)} edge="end" sx={{ width: 32, height: 32 }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  )}
                  {!isPasswordField && endIcon && onEndIconClick && (
                    <IconButton onClick={onEndIconClick} edge="end" sx={{ width: 32, height: 32 }}>
                      {endIcon}
                    </IconButton>
                  )}
                  {!isPasswordField && endIcon && !onEndIconClick && (
                    <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>{endIcon}</Box>
                  )}
                </InputAdornment>
              ),
            }),
          },
        }}
      >
        {children}
      </TextField>
      {showValidationMessage && <ValidationMessage error={helperText} />}
    </Box>
  )
}
