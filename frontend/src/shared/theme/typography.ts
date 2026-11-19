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

// Adapted from the same source repo's theme (see frontend/CLAUDE.md): SuisseIntl everywhere,
// 'Agrandir' and 'Power Grotesk' (font.css) are loaded for display use (e.g. sign-in) but
// deliberately not wired in here - they're applied directly via `sx={{ fontFamily: ... }}`
// where used, not as a theme-wide default.
const FONT = "'SuisseIntl', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif"

export const typography = {
  // the default for anything that reads theme.typography.fontFamily instead of a variant
  fontFamily: FONT,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  // fontWeight 400 on every heading, h1 through h6 - matches the reference app's own typography.ts
  // exactly (its headings are never bold; only subtitle/overline/button pick up weight). This app
  // had drifted to 700 (h1/h2) and 600 (h3-h6) with no documented reason for the difference, which
  // read as a different, heavier font next to the reference - aligned back to 400 (2026-11-19).
  h1: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    ...heading([40, 64], [50, 80]),
  },
  h2: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    ...heading([32, 48], [42, 64]),
  },
  h3: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    ...heading([24, 32], [36, 48]),
  },
  h4: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    ...heading([20, 24], [30, 36]),
  },
  h5: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
    ...heading([18, 20], [27, 30]),
  },
  h6: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 400,
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
  // fontWeight 500, same drift/fix as the headings above - the reference's own button variant
  // is 500, not 600.
  button: {
    fontFamily: FONT,
    letterSpacing: 0,
    fontWeight: 500,
    lineHeight: 24 / 14,
    fontSize: pxToRem(14),
    textTransform: 'unset',
  },
} as const
