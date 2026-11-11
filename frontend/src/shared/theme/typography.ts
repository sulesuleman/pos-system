function pxToRem(value: number) {
  return `${value / 16}rem`
}

declare module '@mui/material/styles' {
  interface TypographyVariants {
    fontWeightSemiBold: React.CSSProperties['fontWeight']
  }
  interface TypographyVariantsOptions {
    fontWeightSemiBold?: React.CSSProperties['fontWeight']
  }
}

/* Headings take two fixed steps: the mobile size below `md` (900px), the desktop size from it -
   so a tablet gets the mobile heading and a long page title still fits. */
const heading = (size: [number, number], lineHeight: [number, number]) => ({
  fontSize: pxToRem(size[0]),
  lineHeight: `${lineHeight[0]}px`,
  '@media (min-width:900px)': { fontSize: pxToRem(size[1]), lineHeight: `${lineHeight[1]}px` },
})

const FONT = "'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif"

export const typography = {
  // the default for anything that reads theme.typography.fontFamily instead of a variant
  fontFamily: FONT,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  h1: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 700,
    ...heading([40, 64], [50, 80]),
  },
  h2: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 700,
    ...heading([32, 48], [42, 64]),
  },
  h3: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 600,
    ...heading([24, 32], [36, 48]),
  },
  h4: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 600,
    ...heading([20, 24], [30, 36]),
  },
  h5: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 600,
    ...heading([18, 20], [27, 30]),
  },
  h6: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 600,
    ...heading([17, 18], [26, 28]),
  },
  subtitle1: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 500,
    lineHeight: 24 / 16,
    fontSize: pxToRem(16),
  },
  subtitle2: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 500,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
  },
  body1: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    lineHeight: 24 / 16,
    fontSize: pxToRem(16),
  },
  body2: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
  },
  caption: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    lineHeight: 18 / 12,
    fontSize: pxToRem(12),
  },
  overline: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 500,
    lineHeight: 18 / 12,
    fontSize: pxToRem(12),
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 600,
    lineHeight: 24 / 14,
    fontSize: pxToRem(14),
    textTransform: 'unset',
  },
} as const
