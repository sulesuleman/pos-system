// Style/sx objects for OverflowTooltip. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useOverflowTooltipStyles() {
  return {
    text: {
      minWidth: 0,
      maxWidth: '100%',
    },
  }
}
