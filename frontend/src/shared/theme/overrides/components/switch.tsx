import { type Theme } from '@mui/material/styles'
import { type SwitchProps, switchClasses } from '@mui/material/Switch'

// ----------------------------------------------------------------------

/* The knob sits INSIDE its track with an even 2px rim: 44 x 24, or 36 x 20 small. */
const SIZE = {
  medium: { width: 44, height: 24, thumb: 20 },
  small: { width: 36, height: 20, thumb: 16 },
}
const RIM = 2

export function switches(theme: Theme) {
  const rootStyles = (ownerState: SwitchProps) => {
    const thumbColor = theme.palette.common.white
    const checkedTrackColor = theme.palette.primary.main

    const size = ownerState.size === 'small' ? SIZE.small : SIZE.medium
    const small = SIZE.small

    return {
      width: size.width,
      height: size.height,
      padding: 0,
      overflow: 'visible',
      // a flex row must never squeeze it: a narrower track leaves the knob hanging off the end
      flexShrink: 0,
      [`& .${switchClasses.thumb}`]: {
        width: size.thumb,
        height: size.thumb,
        boxShadow: 'none',
        color: thumbColor,
      },
      [`& .${switchClasses.track}`]: {
        opacity: 1,
        borderRadius: 999,
        backgroundColor: theme.palette.text.disabled,
        transition: theme.transitions.create(['background-color'], { duration: 150 }),
      },
      [`& .${switchClasses.switchBase}`]: {
        padding: RIM,
        '&:hover': {
          backgroundColor: 'transparent',
        },
        [`&.${switchClasses.checked}`]: {
          transform: `translateX(${size.width - size.thumb - RIM * 2}px)`,
          [`&+.${switchClasses.track}`]: {
            opacity: 1,
            backgroundColor: checkedTrackColor + ' !important',
          },
        },
        [`&.Mui-focusVisible+.${switchClasses.track}`]: {
          outline: `2px solid ${theme.palette.text.primary}`,
          outlineOffset: 2,
        },
        // disabled is a colour pair, never an opacity
        [`&.${switchClasses.disabled}`]: {
          [`& .${switchClasses.thumb}`]: {
            color: theme.palette.action.disabled,
          },
          [`&+.${switchClasses.track}`]: {
            opacity: 1,
            backgroundColor: theme.palette.action.disabledBackground + ' !important',
          },
        },
      },
      // a phone (below `tablet`) draws a medium switch as a small one: 36 x 20
      [theme.breakpoints.down('tablet')]: {
        width: small.width,
        height: small.height,
        [`& .${switchClasses.thumb}`]: {
          width: small.thumb,
          height: small.thumb,
        },
        [`& .${switchClasses.switchBase}.${switchClasses.checked}`]: {
          transform: `translateX(${small.width - small.thumb - RIM * 2}px)`,
        },
      },
    }
  }

  return {
    MuiSwitch: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: SwitchProps }) => rootStyles(ownerState),
      },
    },
  }
}
