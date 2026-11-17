import { useState, type ReactNode } from 'react'
import { PageHeaderConfigContext, SetPageHeaderConfigContext, type PageHeaderConfig } from './pageHeaderStore'

// Lets the shell's Header show whatever the currently-active screen declares (heading,
// subheading, a leading icon or back button, breadcrumbs - see `usePageHeader` in
// pageHeaderStore.ts) without prop-drilling it down through routing, and without the Header
// needing to know anything about individual screens.
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PageHeaderConfig | null>(null)
  return (
    <SetPageHeaderConfigContext.Provider value={setConfig}>
      <PageHeaderConfigContext.Provider value={config}>{children}</PageHeaderConfigContext.Provider>
    </SetPageHeaderConfigContext.Provider>
  )
}
