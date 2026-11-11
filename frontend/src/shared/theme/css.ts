import { alpha, type Theme } from '@mui/material/styles'
import { dividerClasses } from '@mui/material/Divider'
import { checkboxClasses } from '@mui/material/Checkbox'
import { menuItemClasses } from '@mui/material/MenuItem'
import { autocompleteClasses } from '@mui/material/Autocomplete'

// Small style helpers shared by several component overrides below.

// ----------------------------------------------------------------------

export const paper = ({ theme, bgcolor, dropdown }: { theme: Theme; bgcolor?: string; dropdown?: boolean }) => ({
  // a dropdown surface: plain paper - no blur, no colour washes behind it
  backgroundColor: bgcolor ?? theme.palette.background.paper,
  backgroundImage: 'none',
  ...(dropdown && {
    padding: theme.spacing(0.5),
    boxShadow: theme.customShadows.dropdown,
    borderRadius: 8,
  }),
})

// ----------------------------------------------------------------------

// A menu row (MuiMenuItem / Autocomplete option): body2, 6/8 padding, 8 between its parts, a 5px
// corner. A long list scrolls, it does not squash its rows; rows are spaced by the list's own 4px gap.
export const menuItem = (theme: Theme) => ({
  ...theme.typography.body2,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  minHeight: 0,
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1),
  color: theme.palette.text.primary,
  borderRadius: 5,
  [`&.${menuItemClasses.selected}`]: {
    fontWeight: theme.typography.fontWeightMedium,
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  [`& .${checkboxClasses.root}`]: {
    padding: theme.spacing(0.5),
    marginLeft: theme.spacing(-0.5),
    marginRight: theme.spacing(0.5),
  },
  [`&.${autocompleteClasses.option}[aria-selected="true"]`]: {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  [`&+.${dividerClasses.root}`]: {
    margin: theme.spacing(0.5, 0),
  },
})

// ----------------------------------------------------------------------

type BgBlurProps = {
  blur?: number
  opacity?: number
  color?: string
  imgUrl?: string
}

export function bgBlur(props?: BgBlurProps) {
  const color = props?.color || '#000000'
  const blur = props?.blur || 6
  const opacity = props?.opacity || 0.8
  const imgUrl = props?.imgUrl

  if (imgUrl) {
    return {
      position: 'relative',
      backgroundImage: `url(${imgUrl})`,
      '&:before': {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9,
        content: '""',
        width: '100%',
        height: '100%',
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        backgroundColor: alpha(color, opacity),
      },
    } as const
  }

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    backgroundColor: alpha(color, opacity),
  }
}

// ----------------------------------------------------------------------

type BgGradientProps = {
  direction?: string
  color?: string
  startColor?: string
  endColor?: string
  imgUrl?: string
}

export function bgGradient(props?: BgGradientProps) {
  const direction = props?.direction || 'to bottom'
  const startColor = props?.startColor
  const endColor = props?.endColor
  const imgUrl = props?.imgUrl
  const color = props?.color

  if (imgUrl) {
    return {
      background: `linear-gradient(${direction}, ${startColor || color}, ${endColor || color}), url(${imgUrl})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
    }
  }

  return {
    background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
  }
}

// ----------------------------------------------------------------------

export function textGradient(value: string) {
  return {
    background: `-webkit-linear-gradient(${value})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }
}

// ----------------------------------------------------------------------

export const hideScroll = {
  x: {
    overflowX: 'scroll',
  },
  y: {
    overflowY: 'scroll',
  },
} as const
