import { alpha, type Theme } from '@mui/material/styles'
import { inputBaseClasses } from '@mui/material/InputBase'
import { inputLabelClasses } from '@mui/material/InputLabel'
import { formLabelClasses } from '@mui/material/FormLabel'
import { filledInputClasses } from '@mui/material/FilledInput'
import { outlinedInputClasses } from '@mui/material/OutlinedInput'

// ----------------------------------------------------------------------

// Field radius; the field heights are not forced with minHeight - MUI's own padding already
// lands within a few px of the intended height, and a minHeight would override any field given
// its own height.
const FIELD = {
  radius: 10,
}

export function textField(theme: Theme) {
  /* A phone (below `tablet`) draws a medium field as a small one: MUI's small paddings and label
     positions. The phone paddings sit in `:where()` so they outweigh MUI's own input padding but
     not the label-less TextField padding below, which steps itself. */
  const PHONE = theme.breakpoints.down('tablet')

  const color = {
    focused: theme.palette.text.secondary,
    active: theme.palette.text.secondary,
    // empty and not focused: tertiary, so a resting label never reads as disabled
    label: theme.palette.text.tertiary,
    placeholder: theme.palette.text.disabled,
  }

  const font = {
    label: theme.typography.body1,
    value: theme.typography.body1,
  }

  /* Filled states draw on the edge with an inset outline, so none of them moves the layout:
     focus a 2px edge, error a 1px red edge (2px when focused), disabled hollow - no fill, a
     plain edge. */
  const filledRoot = (classes: { focused: string; error: string; disabled: string }) => ({
    borderRadius: FIELD.radius,
    backgroundColor: theme.palette.components.textField.filled,
    '&:hover': {
      backgroundColor: theme.palette.grey['500Transparent'][16],
    },
    [`&.${classes.focused}`]: {
      backgroundColor: theme.palette.grey['500Transparent'][16],
      outline: `2px solid ${theme.palette.text.primary}`,
      outlineOffset: -2,
    },
    [`&.${classes.error}`]: {
      backgroundColor: alpha(theme.palette.error.main, 0.08),
      outline: `1px solid ${theme.palette.error.main}`,
      outlineOffset: -1,
      [`&.${classes.focused}`]: {
        outlineWidth: 2,
        outlineOffset: -2,
      },
    },
    [`&.${classes.disabled}`]: {
      backgroundColor: 'transparent',
      outline: `1px solid ${theme.palette.divider}`,
      outlineOffset: -1,
    },
    '&:before, &:after': {
      borderBottom: 'none',
    },
    '&:hover:not(.Mui-disabled):before': {
      borderBottom: 'none',
    },
  })

  return {
    // DEFAULTS - filled is this app's field: text, select and the form control around them
    MuiTextField: {
      defaultProps: { variant: 'filled' },
      styleOverrides: {
        /* A filled field keeps room at the top for its floating label. One with no label (a
           search box, a placeholder only) would sit its text low, so it gets MUI's hiddenLabel
           padding: even above and below. */
        root: {
          [`&:not(:has(> .${inputLabelClasses.root})) .${filledInputClasses.input}`]: {
            paddingTop: 16,
            paddingBottom: 17,
          },
          [`&:not(:has(> .${inputLabelClasses.root})) .${inputBaseClasses.sizeSmall} .${filledInputClasses.input}`]: {
            paddingTop: 8,
            paddingBottom: 9,
          },
          [PHONE]: {
            [`&:not(:has(> .${inputLabelClasses.root})) .${filledInputClasses.input}`]: {
              paddingTop: 8,
              paddingBottom: 9,
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: { variant: 'filled' },
    },
    MuiFormControl: {
      defaultProps: { variant: 'filled' },
    },

    // HELPER
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          ...theme.typography.caption,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          margin: 0,
          paddingTop: 8,
          paddingLeft: 12,
          color: theme.palette.text.secondary,
          '&.Mui-error': {
            color: theme.palette.error.main,
          },
        },
      },
    },

    // LABEL
    MuiFormLabel: {
      styleOverrides: {
        root: {
          ...font.value,
          color: color.label,
          // Colour tracks focus/value, never the shrink class alone: a label held up for layout
          // (so a placeholder can show beneath it) must not borrow the promoted colour while it
          // is still genuinely idle.
          [`&.${inputLabelClasses.focused}, &.${formLabelClasses.filled}`]: {
            color: color.active,
          },
          [`&.${inputLabelClasses.error}`]: {
            color: theme.palette.error.main,
          },
          [`&.${inputLabelClasses.disabled}`]: {
            color: theme.palette.text.disabled,
          },
          [`&.${inputLabelClasses.shrink}`]: {
            ...font.label,
            fontWeight: theme.typography.fontWeightMedium,
            // where a filled field's label floats to: 7px from the top
            [`&.${inputLabelClasses.filled}`]: {
              transform: 'translate(12px, 7px) scale(0.75)',
            },
          },
          // the small field's label positions, for a medium field on a phone
          [PHONE]: {
            [`&.${inputLabelClasses.filled}:not(.${inputLabelClasses.sizeSmall})`]: {
              transform: 'translate(12px, 13px) scale(1)',
              [`&.${inputLabelClasses.shrink}`]: {
                transform: 'translate(12px, 4px) scale(0.75)',
              },
            },
            [`&.${inputLabelClasses.outlined}:not(.${inputLabelClasses.sizeSmall}):not(.${inputLabelClasses.shrink})`]:
              {
                transform: 'translate(14px, 9px) scale(1)',
              },
          },
        },
        asterisk: {
          color: theme.palette.error.main,
        },
      },
    },

    // BASE
    MuiInputBase: {
      styleOverrides: {
        root: {
          [`&.${inputBaseClasses.disabled}`]: {
            '& svg': {
              color: theme.palette.text.disabled,
            },
          },
          '& .MuiInputAdornment-root .MuiIconButton-root': {
            marginRight: '-4px',
            width: '32px',
            height: '32px',
          },
        },
        input: {
          ...font.value,
          '&::placeholder': {
            opacity: 1,
            color: color.placeholder,
          },
        },
      },
    },

    // STANDARD
    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: theme.palette.components.textField.underline,
          },
          '&:after': {
            borderBottomColor: theme.palette.text.primary,
          },
        },
      },
    },

    MuiInputAdornment: {
      styleOverrides: {
        positionStart: {
          marginRight: 8,
        },
      },
    },

    // OUTLINED
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: FIELD.radius,
          [`&:hover:not(.${outlinedInputClasses.disabled}):not(.${outlinedInputClasses.focused}):not(.${outlinedInputClasses.error}) .${outlinedInputClasses.notchedOutline}`]:
            {
              borderColor: theme.palette.text.primary,
            },
          // a textarea starts at 98px and grows from the top
          [`&.${inputBaseClasses.multiline}`]: {
            minHeight: 98,
            alignItems: 'flex-start',
            padding: '16px 14px',
          },
          [`&.${outlinedInputClasses.focused}`]: {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.text.primary,
              borderWidth: 2,
            },
          },
          [`&.${outlinedInputClasses.error}`]: {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.error.main,
            },
          },
          [`&.${outlinedInputClasses.disabled}`]: {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.action.disabledBackground,
            },
          },
          // a phone draws a medium field as a small one (MUI's small padding: 40 tall)
          [PHONE]: {
            [`&:where(:not(.${inputBaseClasses.multiline})) .${outlinedInputClasses.input}`]: {
              paddingTop: 8.5,
              paddingBottom: 8.5,
            },
          },
        },
        notchedOutline: {
          borderColor: theme.palette.components.textField.outline,
          transition: theme.transitions.create(['border-color'], {
            duration: theme.transitions.duration.shortest,
          }),
        },
      },
    },

    // FILLED
    MuiFilledInput: {
      defaultProps: { disableUnderline: true },
      styleOverrides: {
        root: {
          ...filledRoot(filledInputClasses),
          // MUI's 12px left stays; the right edge is 10 unless an end adornment takes it over
          [`&:not(.${filledInputClasses.adornedEnd}) .${filledInputClasses.input}`]: {
            paddingRight: 10,
          },
          // a phone draws a medium field as a small one (MUI's small paddings)
          [PHONE]: {
            [`&:where(:not(.${filledInputClasses.multiline}):not(.${filledInputClasses.hiddenLabel})) .${filledInputClasses.input}`]:
              {
                paddingTop: 21,
                paddingBottom: 4,
              },
            [`&:where(.${filledInputClasses.hiddenLabel}:not(.${filledInputClasses.multiline})) .${filledInputClasses.input}`]:
              {
                paddingTop: 8,
                paddingBottom: 9,
              },
          },
        },
      },
    },
    // Note: the reference theme also mirrors MuiFilledInput onto MuiPickersFilledInput, so a
    // date/time picker field (from @mui/x-date-pickers) looks the same. That package is not a
    // dependency of this app, so that mirror override is intentionally omitted here; add it back
    // alongside @mui/x-date-pickers if/when this app adds date/time pickers.
  }
}
