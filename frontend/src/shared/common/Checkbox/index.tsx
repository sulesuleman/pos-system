import type { ReactNode } from 'react'
import Checkbox, { type CheckboxProps } from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import type { SxProps, Theme } from '@mui/material/styles'
import { ValidationMessage } from '../Inputs/ValidationMessage'

export type StyledCheckboxProps = CheckboxProps & {
  label: ReactNode
  error?: string
  /** Styles for the FormControlLabel wrapper, e.g. margin or the gap to the label text. */
  wrapperSx?: SxProps<Theme>
}

// A themed, decoupled checkbox: props in, UI out. `checked`/`onChange` stay plain controlled-
// input props - this never reaches for react-hook-form itself, so a form-field wrapper built on
// its `Controller` (or any other form library) can drive it from its own field state instead of
// this component owning that wiring.
export function StyledCheckbox({ label, error, wrapperSx, ...props }: StyledCheckboxProps) {
  return (
    <>
      <FormControlLabel control={<Checkbox {...props} />} label={label} sx={wrapperSx} />
      <ValidationMessage error={error} />
    </>
  )
}
