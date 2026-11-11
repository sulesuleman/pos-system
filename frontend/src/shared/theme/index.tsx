import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider, createTheme, type Theme, type ThemeOptions } from '@mui/material'
import { customShadows } from './customShadows'
import { componentsOverrides } from './overrides'
import { palette } from './palette'
import { shadows } from './shadows'
import { typography } from './typography'
import { breakpoints } from './breakpoints'
import { ThemeModeContext, readStoredThemeMode, resolveInitialThemeMode, storeThemeMode, type ThemeMode } from './theme-mode'

type Props = Readonly<{
  children: ReactNode
}>

// Theme foundation shared by both entry points (Manager/Owner and Counter): palette, shadows,
// typography and breakpoints per mode, MUI component overrides, and the light/dark mode context
// (OS preference by default, explicit choice persisted in localStorage).
export function AppThemeProvider({ children }: Props) {
  const [mode, setModeState] = useState<ThemeMode>(resolveInitialThemeMode)

  // Track the OS preference live, but only while the user has not made an explicit choice of
  // their own - once they have, their choice always wins.
  useEffect(() => {
    if (readStoredThemeMode() !== null) {
      return
    }
    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const handleChange = (event: MediaQueryListEvent) => {
      setModeState(event.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    storeThemeMode(next)
    setModeState(next)
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const theme = useMemo(() => {
    const baseTheme = createTheme({
      palette: palette(mode),
      shadows: shadows(mode),
      customShadows: customShadows(mode),
      typography,
      // a step tighter than the raw token scale
      shape: { borderRadius: 7 },
      breakpoints,
    } as ThemeOptions)
    baseTheme.components = componentsOverrides(baseTheme) as unknown as Theme['components']
    return baseTheme
  }, [mode])

  const modeContextValue = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode])

  return (
    <ThemeModeContext.Provider value={modeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
