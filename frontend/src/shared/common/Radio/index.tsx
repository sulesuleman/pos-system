import type { ReactNode } from 'react'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio, { type RadioProps } from '@mui/material/Radio'
import RadioGroup, { type RadioGroupProps } from '@mui/material/RadioGroup'
import type { SxProps, Theme } from '@mui/material/styles'
import { useRadioStyles } from './useRadioStyles'

export type StyledRadioOption = {
  value: string | number
  label: ReactNode
  disabled?: boolean
}

export type StyledRadioProps = Omit<RadioGroupProps, 'children'> & {
  /** The group's legend, shown above the options - omitted entirely has no FormLabel rendered. */
  label?: ReactNode
  options: StyledRadioOption[]
  error?: string
  /** Props forwarded to every option's own Radio control (e.g. `size`, `color`). */
  radioProps?: Omit<RadioProps, 'value' | 'checked' | 'disabled'>
  wrapperSx?: SxProps<Theme>
}

// A themed, decoupled radio group: props in, UI out. `value`/`onChange` stay plain controlled-
// input props - this never reaches for react-hook-form itself, so a form-field wrapper built on
// its `Controller` (or any other form library) can drive it from its own field state instead of
// this component owning that wiring. `error` only tints the group red (via FormControl); it
// renders no message of its own.
export function StyledRadio({ label, options, error, radioProps, wrapperSx, sx, ...props }: StyledRadioProps) {
  const styles = useRadioStyles()

  return (
    <FormControl error={!!error} sx={wrapperSx}>
      {label && <FormLabel sx={styles.legend}>{label}</FormLabel>}
      <RadioGroup {...props} sx={sx}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            control={<Radio {...radioProps} />}
            label={option.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  )
}
