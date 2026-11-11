import IconButton, { type IconButtonProps } from '@mui/material/IconButton'
import { useThemeMode } from '../../../theme/theme-mode'
import { useThemeToggleButtonStyles } from './useThemeToggleButtonStyles'

export type ThemeToggleButtonProps = Omit<IconButtonProps, 'onClick' | 'children'>

// A light/dark mode toggle, reachable from any screen in either entry point. Reads and flips
// the app-wide theme mode (see shared/theme/theme-mode.ts) - no page- or feature-specific logic.
export function ThemeToggleButton(props: ThemeToggleButtonProps) {
  const { mode, toggleMode } = useThemeMode()
  const styles = useThemeToggleButtonStyles()
  const isDark = mode === 'dark'

  return (
    <IconButton
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleMode}
      sx={styles.root}
      {...props}
    >
      {isDark ? <SunGlyph /> : <MoonGlyph />}
    </IconButton>
  )
}

function SunGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
        <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
        <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
        <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
      </g>
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
    </svg>
  )
}
