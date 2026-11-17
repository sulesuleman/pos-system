import { createContext, useContext, useEffect, type ReactNode } from 'react'

export type Breadcrumb = { label: string; path?: string }

export type PageHeaderConfig = {
  heading: string
  subheading?: string
  /** Decorative leading icon for the page. Ignored when `onBack` is given - a back button
   * takes its place instead. */
  icon?: ReactNode
  /** When given, the header shows a back button (not the decorative icon) that calls this. */
  onBack?: () => void
  /** Only rendered when there's more than one crumb - a single-entry trail is just the
   * heading repeated, which the header already shows. */
  breadcrumbs?: Breadcrumb[]
  /** Page-specific action button(s) (e.g. "Create Mart"), right-aligned in the header - every
   * screen can have different ones, same as its icon. */
  rightContent?: ReactNode
  /** A `Tabbar` (see shared/common/Navigation/Tabbar) for switching between views on the same
   * screen - rendered as its own full-width row below the heading. */
  tabs?: ReactNode
}

// Split into two contexts on purpose, not one {config, setConfig} value: a screen calling
// `usePageHeader` only ever needs the setter, and must never re-render just because the
// currently-displayed heading changed (e.g. when a different screen's config lands). If it did,
// it would reconstruct a new config object on that re-render, call the setter again, and loop
// forever - a real infinite-render bug, not a hypothetical one. The setter from `useState` has a
// stable identity across renders, so a context carrying only it never changes value and never
// re-renders its consumers. Only Header (which must react to changes) reads the value context.
export const PageHeaderConfigContext = createContext<PageHeaderConfig | null>(null)
export const SetPageHeaderConfigContext = createContext<(config: PageHeaderConfig | null) => void>(() => {})

// For Header: the current config, re-rendering whenever it changes.
export function usePageHeaderValue() {
  return useContext(PageHeaderConfigContext)
}

// Called by a screen to declare what the header should show while it's mounted. Clears itself
// on unmount, so navigating away never leaves a stale heading showing for the next screen.
export function usePageHeader(config: PageHeaderConfig) {
  const setConfig = useContext(SetPageHeaderConfigContext)
  useEffect(() => {
    setConfig(config)
    return () => setConfig(null)
  }, [config, setConfig])
}
