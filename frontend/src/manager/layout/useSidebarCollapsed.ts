import { useCallback, useState } from 'react'

// The user's explicit sidebar collapse choice, remembered in this browser - same localStorage
// pattern as the theme mode toggle (shared/theme/theme-mode.ts).
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pos.sidebarCollapsed'

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function storeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  } catch {
    // Storage blocked (private window): the choice still applies for this session.
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(readStoredCollapsed)

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    storeCollapsed(value)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      storeCollapsed(next)
      return next
    })
  }, [])

  return { collapsed, setCollapsed, toggleCollapsed }
}
