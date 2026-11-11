import type { Theme } from '@mui/material/styles'
import type { ToggleButtonProps } from '@mui/material/ToggleButton'
import type { ToggleButtonGroupProps } from '@mui/material/ToggleButtonGroup'

// ----------------------------------------------------------------------

// Toggle buttons take the button sizes: height, padding and radius.
const SIZE = {
  small: { height: 30, px: 8, radius: 8 },
  medium: { height: 36, px: 12, radius: 10 },
  large: { height: 48, px: 16, radius: 12 },
}
// a phone (below `tablet`) draws each size as the next one down; small stays small
const DOWN = { large: 'medium', medium: 'small', small: 'small' } as const

export function toggleButton(theme: Theme) {
  const PHONE = theme.breakpoints.down('tablet')

  return {
    MuiToggleButton: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: ToggleButtonProps }) => {
          const size = SIZE[ownerState.size ?? 'medium']
          const phone = SIZE[DOWN[ownerState.size ?? 'medium']]
          return {
            ...theme.typography.subtitle2,
            gap: 8,
            border: 'none',
            textTransform: 'none',
            minWidth: size.height,
            height: size.height,
            padding: `0 ${size.px}px`,
            borderRadius: size.radius,
            [PHONE]: {
              minWidth: phone.height,
              height: phone.height,
              padding: `0 ${phone.px}px`,
              borderRadius: phone.radius,
            },
            color: theme.palette.text.secondary,
            '&.Mui-selected': {
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.action.selected,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            },
          }
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        // nested corners: the group's radius is its buttons' radius plus its padding
        root: ({ ownerState }: { ownerState: ToggleButtonGroupProps }) => ({
          gap: 4,
          padding: 4,
          borderRadius: SIZE[ownerState.size ?? 'medium'].radius + 4,
          border: `1px solid ${theme.palette.components.paper.outlined}`,
          [PHONE]: { borderRadius: SIZE[DOWN[ownerState.size ?? 'medium']].radius + 4 },
        }),
        grouped: ({ ownerState }: { ownerState: ToggleButtonGroupProps }) => ({
          '&, &:not(:first-of-type), &:not(:last-of-type)': {
            margin: 0,
            border: 'none',
            borderRadius: SIZE[ownerState.size ?? 'medium'].radius,
            // this outweighs the button's own phone radius, so it steps down here too
            [PHONE]: { borderRadius: SIZE[DOWN[ownerState.size ?? 'medium']].radius },
          },
        }),
      },
    },
  }
}
