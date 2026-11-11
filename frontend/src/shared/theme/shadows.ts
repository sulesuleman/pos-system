import { alpha, type Shadows } from '@mui/material/styles'
import { palette as themePalette } from './palette'

// ----------------------------------------------------------------------

const palette = themePalette('light')

const LIGHT_MODE = palette.grey[500]

// shadows are the same grey in both schemes
const DARK_MODE = palette.grey[500]

/* Seven elevation steps - z1, z4, z8, z12, z16, z20, z24 - all one grey at 16%. MUI wants
   twenty-five, so each MUI step takes the step at or below it: elevation 5, 6 and 7 are all z4.
   Nothing between the seven is invented. */
const STEPS = [1, 4, 8, 12, 16, 20, 24] as const

function createShadow(color: string): Shadows {
  const tint = alpha(color, 0.16)
  const z: Record<(typeof STEPS)[number], string> = {
    1: `0 1px 2px 0 ${tint}`,
    4: `0 4px 8px 0 ${tint}`,
    8: `0 8px 16px 0 ${tint}`,
    12: `0 12px 24px -4px ${tint}`,
    16: `0 16px 32px -4px ${tint}`,
    20: `0 20px 40px -4px ${tint}`,
    24: `0 24px 48px 0 ${tint}`,
  }

  return Array.from({ length: 25 }, (_, i) => {
    if (i === 0) return 'none'
    const step = [...STEPS].reverse().find((s) => s <= i) ?? 1
    return z[step]
  }) as Shadows
}

export function shadows(mode: 'light' | 'dark') {
  return mode === 'light' ? createShadow(LIGHT_MODE) : createShadow(DARK_MODE)
}
