import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark'

/* The user's explicit appearance choice, remembered in this browser. Until they choose one,
   the mode follows the OS/browser preference (prefers-color-scheme) instead of defaulting to
   light. */
export const THEME_MODE_STORAGE_KEY = 'pos.themeMode'

const isThemeMode = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark'

// The explicit choice only, or null if the user has never overridden the OS preference.
export const readStoredThemeMode = (): ThemeMode | null => {
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY)
    return isThemeMode(stored) ? stored : null
  } catch {
    return null
  }
}

export const storeThemeMode = (mode: ThemeMode) => {
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  } catch {
    // Storage blocked (private window): the choice still applies for this session.
  }
}

const prefersDarkMode = (): boolean => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

// The mode to render on first paint: the stored explicit choice if there is one, else the OS
// preference.
export const resolveInitialThemeMode = (): ThemeMode => readStoredThemeMode() ?? (prefersDarkMode() ? 'dark' : 'light')

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
})

export const useThemeMode = () => useContext(ThemeModeContext)
