import type { BreakpointsOptions } from '@mui/material/styles'

// Extend the Breakpoint interface with the extra device and big-screen steps this app uses
declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true
    phoneSm: true // 375: small phones
    sm: true
    tablet: true // 768: a phone is below it
    md: true
    laptop: true // 1024: tables become cards below it
    lg: true
    xl: true
    xxl: true // above 1920: more columns and a wider page
    uhd: true // 2560 up: wide dashboards split in two halves
  }
}

export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,
    phoneSm: 375,
    sm: 600,
    tablet: 768,
    md: 900,
    laptop: 1024,
    lg: 1200,
    xl: 1536,
    xxl: 1921,
    uhd: 2560,
  },
}
