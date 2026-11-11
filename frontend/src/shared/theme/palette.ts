import { alpha } from '@mui/material/styles'

// ----------------------------------------------------------------------
// Palette tokens. Structure adapted from another project's theme foundation
// (see frontend/CLAUDE.md); the hex values, token names and dark-mode mapping
// are specific to this app, not copied as "the brand".
// ----------------------------------------------------------------------

export type ColorSchema = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

type PaletteComponents = {
  textField: { outline: string; underline: string; filled: string }
  button: { outlined: string }
  paper: { outlined: string; bgBlur: string }
  backdrop: string
  tooltip: { bg: string; color: string }
}

type PaletteGlobal = {
  inherit: { color: string; bg: string; bgHovered: string }
  default: { color: string; bg: string; bgHovered: string }
}

type PaletteGradients = {
  field: string
  accent: string
}

declare module '@mui/material/styles' {
  interface TypeBackground {
    neutral: string
    background: string
  }
  interface Palette {
    components: PaletteComponents
    global: PaletteGlobal
    gradients: PaletteGradients
  }
  interface PaletteOptions {
    components?: PaletteComponents
    global?: PaletteGlobal
    gradients?: PaletteGradients
  }
  interface TypeText {
    tertiary?: string
  }
  interface SimplePaletteColorOptions {
    lighter: string
    darker: string
    shades: {
      8: string
      12: string
      16: string
      20: string
      24: string
      32: string
      48: string
      80: string
      contrastText: string
    }
  }

  interface PaletteColor {
    lighter: string
    darker: string
    // the step to use when a colour must stay legible on both light and dark surfaces
    mainOrLight: string
    darkOrLight: string
    darkerOrLighter: string
    lighterOrDarker: string
    shades: {
      8: string
      12: string
      16: string
      20: string
      24: string
      32: string
      48: string
      80: string
      contrastText: string
    }
  }

  interface Color {
    0: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
    '500Transparent': {
      8: string
      12: string
      16: string
      20: string
      24: string
      32: string
      48: string
      80: string
    }
  }
  interface CommonColors {
    whiteTransparent92: string
    grey: {
      neutral: string
      main: string
      dark: string
    }
  }
}

export const generateTransparencyShades = (color: string) => ({
  8: alpha(color, 0.08),
  12: alpha(color, 0.12),
  16: alpha(color, 0.16),
  20: alpha(color, 0.2),
  24: alpha(color, 0.24),
  32: alpha(color, 0.32),
  48: alpha(color, 0.48),
  80: alpha(color, 0.8),
})

// SETUP COLORS

const GREY = {
  0: '#FFFFFF',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#212B36',
  900: '#161C24',
  '500Transparent': generateTransparencyShades('#919EAB'),
}

const PRIMARY = {
  lighter: '#7AB9E1',
  light: '#00B6ED',
  main: '#3192D0',
  dark: '#226996',
  darker: '#00244D',
  contrastText: '#FFFFFF',
  shades: generateTransparencyShades('#3192D0'),
}

const SECONDARY = {
  lighter: '#EFD6FF',
  light: '#C684FF',
  main: '#8E33FF',
  dark: '#5119B7',
  darker: '#27097A',
  contrastText: '#FFFFFF',
  shades: generateTransparencyShades('#8E33FF'),
}

const INFO = {
  lighter: '#CAFDF5',
  light: '#61F3F3',
  main: '#00B8D9',
  dark: '#006C9C',
  darker: '#003768',
  contrastText: '#FFFFFF',
  shades: generateTransparencyShades('#00B8D9'),
}

const SUCCESS = {
  lighter: '#D3FCD2',
  light: '#77ED8B',
  main: '#22C55E',
  dark: '#118D57',
  darker: '#065E49',
  contrastText: '#FFFFFF',
  shades: generateTransparencyShades('#22C55E'),
}

const WARNING = {
  lighter: '#FFF5CC',
  light: '#FFD666',
  main: '#FFAB00',
  dark: '#B76E00',
  darker: '#7A4100',
  // dark text on yellow, for contrast
  contrastText: '#212B36',
  shades: generateTransparencyShades('#FFAB00'),
}

const ERROR = {
  lighter: '#FFE9D5',
  light: '#FFAC82',
  main: '#FF5630',
  dark: '#B71D18',
  darker: '#7A0916',
  contrastText: '#FFFFFF',
  shades: generateTransparencyShades('#FF5630'),
}

const COMMON = {
  common: {
    black: '#000000',
    white: '#FFFFFF',
    whiteTransparent92: alpha('#FFFFFF', 0.92),
    grey: {
      neutral: '#F5F5F8',
      main: '#9A9A98',
      dark: '#575756',
    },
  },
  primary: PRIMARY,
  secondary: SECONDARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  divider: GREY['500Transparent'][20],
  action: {
    active: GREY[600],
    hover: GREY['500Transparent'][8],
    selected: GREY['500Transparent'][16],
    focus: GREY['500Transparent'][24],
    disabled: GREY['500Transparent'][80],
    disabledBackground: GREY['500Transparent'][20],
    hoverOpacity: 0.08,
    selectedOpacity: 0.16,
    disabledOpacity: 0.48,
    focusOpacity: 0.24,
    activatedOpacity: 0.24,
  },
}

// `main <-> light`, `dark <-> light`, `darker <-> lighter`, `lighter <-> darker`
const withModeSteps = <T extends { main: string; light: string; dark: string; darker: string; lighter: string }>(
  color: T,
  mode: 'light' | 'dark',
) => ({
  ...color,
  mainOrLight: mode === 'light' ? color.main : color.light,
  darkOrLight: mode === 'light' ? color.dark : color.light,
  darkerOrLighter: mode === 'light' ? color.darker : color.lighter,
  lighterOrDarker: mode === 'light' ? color.lighter : color.darker,
})

const brandColors = (mode: 'light' | 'dark') => ({
  primary: withModeSteps(PRIMARY, mode),
  secondary: withModeSteps(SECONDARY, mode),
  info: withModeSteps(INFO, mode),
  success: withModeSteps(SUCCESS, mode),
  warning: withModeSteps(WARNING, mode),
  error: withModeSteps(ERROR, mode),
})

const components = (mode: 'light' | 'dark') => ({
  textField: {
    outline: GREY['500Transparent'][20],
    underline: GREY['500Transparent'][32],
    filled: GREY['500Transparent'][8],
  },
  button: { outlined: GREY['500Transparent'][32] },
  paper: {
    outlined: GREY['500Transparent'][16],
    bgBlur: mode === 'light' ? alpha(GREY[0], 0.9) : alpha(GREY[800], 0.9),
  },
  backdrop: alpha(GREY[900], 0.8),
  tooltip: { bg: mode === 'light' ? GREY[800] : GREY[700], color: GREY[0] },
})

const global = (mode: 'light' | 'dark') => ({
  inherit:
    mode === 'light'
      ? { color: GREY[0], bg: GREY[800], bgHovered: GREY[700] }
      : { color: GREY[800], bg: GREY[0], bgHovered: GREY[400] },
  default: { color: GREY[800], bg: GREY[300], bgHovered: GREY[400] },
})

const gradients = (mode: 'light' | 'dark') => ({
  // The hero panel behind the sign-in form: a bold colour field in light mode, a near-black
  // one in dark mode so white text and the form card stay legible on both.
  field:
    mode === 'light'
      ? `linear-gradient(135deg, ${PRIMARY.darker} 5%, ${PRIMARY.light} 100%)`
      : `linear-gradient(135deg, color-mix(in srgb, ${PRIMARY.darker}, black 45%) 0%, color-mix(in srgb, ${PRIMARY.darker}, black 80%) 100%)`,
  accent: `linear-gradient(135deg, ${PRIMARY.light} 0%, ${PRIMARY.main} 100%)`,
})

export function palette(mode: 'light' | 'dark') {
  const light = {
    ...COMMON,
    ...brandColors('light'),
    components: components('light'),
    global: global('light'),
    gradients: gradients('light'),
    mode: 'light' as const,
    text: {
      primary: GREY[900],
      secondary: GREY[700],
      disabled: GREY[500],
      tertiary: GREY[600],
    },
    background: {
      paper: COMMON.common.white,
      default: COMMON.common.white,
      neutral: GREY[200],
      // the canvas a page sits on, under the white cards
      background: '#F9F9F9',
    },
    action: {
      ...COMMON.action,
      active: GREY[600],
    },
  }

  const dark = {
    ...COMMON,
    ...brandColors('dark'),
    components: components('dark'),
    global: global('dark'),
    gradients: gradients('dark'),
    mode: 'dark' as const,
    text: {
      primary: COMMON.common.white,
      // grey 400: 500 is too faint on the dark panels
      secondary: GREY[400],
      disabled: GREY[600],
      tertiary: GREY[500],
    },
    background: {
      // cards and panels a step lighter (800) than the canvas they sit on (900), so a card
      // reads as a surface instead of vanishing into the page
      paper: GREY[800],
      default: GREY[900],
      neutral: GREY['500Transparent'][12],
      background: GREY[900],
    },
    action: {
      ...COMMON.action,
      active: GREY[500],
    },
  }

  return mode === 'light' ? light : dark
}
