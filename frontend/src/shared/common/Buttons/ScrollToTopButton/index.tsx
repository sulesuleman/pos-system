import { useEffect, useState, type RefObject } from 'react'
import Fab, { type FabProps } from '@mui/material/Fab'
import type { ResponsiveStyleValue } from '@mui/system'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import { useScrollToTopButtonStyles } from './useScrollToTopButtonStyles'

export type ScrollToTopButtonProps = Omit<FabProps, 'onClick' | 'children'> & {
  /** How far down (in px) before the button fades in. */
  threshold?: number
  /** Watches and scrolls this container instead of the page itself - for a screen whose own
   * content container scrolls internally (see PageLayout) rather than the document. */
  containerRef?: RefObject<HTMLElement | null>
  /** Override for the default `bottom` offset - for a screen with its own fixed element (e.g.
   * PageLayout's BottomNav) this button must stay clear of. */
  bottomOffset?: ResponsiveStyleValue<string | number>
}

// A floating button that fades in once scrolled past `threshold`, and smooth-scrolls back to
// the top when clicked. Defaults to watching/scrolling the page itself; pass `containerRef` for
// a screen whose own container is the one scroll surface instead.
export function ScrollToTopButton({ threshold = 320, containerRef, bottomOffset, ...props }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false)
  const styles = useScrollToTopButtonStyles({ visible, bottomOffset })

  useEffect(() => {
    const target: Window | HTMLElement = containerRef?.current ?? window
    const getScrollTop = () => (target === window ? window.scrollY : (target as HTMLElement).scrollTop)
    const onScroll = () => setVisible(getScrollTop() > threshold)
    onScroll()
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [threshold, containerRef])

  function handleClick() {
    const target = containerRef?.current
    if (target) {
      target.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <Fab
      size="medium"
      color="primary"
      aria-label="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={handleClick}
      sx={styles.root}
      {...props}
    >
      <KeyboardArrowUpOutlinedIcon />
    </Fab>
  )
}
