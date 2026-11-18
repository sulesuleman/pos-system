import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { ScrollToTopButton } from '../../../shared/common/Buttons/ScrollToTopButton'
import { Header } from '../Header'
import { BOTTOM_NAV_HEIGHT } from '../constants'
import { usePageLayoutStyles } from './usePageLayoutStyles'

// Clear of the fixed BottomNav plus its own 16px gap and the safe-area inset, below `tablet`
// only - at `tablet`+ there's no bottom bar to clear (same breakpoint BottomNav itself uses).
const SCROLL_TOP_BOTTOM_OFFSET = {
  xs: `calc(${BOTTOM_NAV_HEIGHT}px + 16px + env(safe-area-inset-bottom))`,
  tablet: 16,
  laptop: 24,
}

// Scrolling past this many pixels is what triggers the header's blurred/bordered look.
const SCROLL_THRESHOLD_PX = 4

export type PageLayoutProps = {
  /** Shown only below `laptop`, where the sidebar is a drawer instead of always on screen. */
  onOpenMobileNav: () => void
}

// The content column's own frame, mirroring the reference app's PageLayout: ONE container
// scrolls (not the page), the header pins to its top as that container scrolls under it, and
// every route renders into the panel below it via Outlet. ScrollToTopButton watches this same
// container, not the window.
export function PageLayout({ onOpenMobileNav }: PageLayoutProps) {
  const styles = usePageLayoutStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const onScroll = () => setScrolled(el.scrollTop > SCROLL_THRESHOLD_PX)
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Box ref={containerRef} sx={styles.container}>
      <Header onOpenMobileNav={onOpenMobileNav} scrolled={scrolled} />
      <Box component="main" sx={styles.panel}>
        <Box sx={styles.content}>
          <Outlet />
        </Box>
      </Box>
      <ScrollToTopButton containerRef={containerRef} bottomOffset={SCROLL_TOP_BOTTOM_OFFSET} />
    </Box>
  )
}
