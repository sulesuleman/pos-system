// Style/sx objects for ThemeToggleButton. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useThemeToggleButtonStyles() {
  return {
    root: {
      borderRadius: '50%',
    },
  }
}
