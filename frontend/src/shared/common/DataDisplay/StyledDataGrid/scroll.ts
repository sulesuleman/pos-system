import { useLayoutEffect, type RefObject } from 'react'

// The nearest ancestor that scrolls vertically, or the document itself. A grid that grows with
// its rows loads more by this box.
export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let parent = el?.parentElement ?? null
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }
    parent = parent.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? null
}

// Slack for sub-pixel scroll positions, so "at the bottom" still holds at fractional zoom levels.
const BOTTOM_TOLERANCE_PX = 2

// Whether the user has reached the end of the rows in `wrapper`, so the next page may load: the
// last row is on screen. Measured on the rows themselves (not the grid's own box, which stretches
// to fill its container) against every ancestor that scrolls or clips them. A grid too short to
// fill its box shows its last row from the start, so its next page loads until the box fills up
// or rows run out - nothing could scroll it otherwise.
export function isGridBottomReached(wrapper: HTMLElement | null): boolean {
  // A grid that isn't rendered (a hidden tab) has no box, which would otherwise read as "at the
  // bottom".
  if (!wrapper || wrapper.getClientRects().length === 0) {
    return false
  }

  const scroller = wrapper.querySelector('.MuiDataGrid-virtualScrollerContent') as HTMLElement | null
  const rowsBottom = scroller
    ? scroller.getBoundingClientRect().bottom
    : wrapper.getBoundingClientRect().top + wrapper.clientTop + wrapper.scrollHeight - wrapper.scrollTop

  let viewBottom = window.innerHeight
  for (let el: HTMLElement | null = scroller ? scroller.parentElement : wrapper; el; el = el.parentElement) {
    if (el === document.body || el === document.documentElement) {
      break
    }
    if (window.getComputedStyle(el).overflowY !== 'visible') {
      viewBottom = Math.min(viewBottom, el.getBoundingClientRect().bottom)
    }
  }
  return rowsBottom <= viewBottom + BOTTOM_TOLERANCE_PX
}

// Pins a list's toolbar to the page and hands where it ends - its own sticky `top` plus its
// height - to the grid below it as `--sticky-top` (on their shared parent), so the column header
// pins right under it.
export function useStickyTop(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) {
      return
    }
    const update = () => {
      const top = parseFloat(window.getComputedStyle(el).top) || 0
      parent.style.setProperty('--sticky-top', `${top + el.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      parent.style.removeProperty('--sticky-top')
    }
  }, [ref])
}

// What a press must not turn into a drag: anything the pointer is there to operate.
const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="checkbox"], label'
// Further than this from the press and it is a drag, not a click.
const DRAG_THRESHOLD_PX = 4

// Lets a mouse drag a table that scrolls sideways, as a finger does. A browser in a phone-sized
// window has no horizontal wheel and draws scrollbars as overlays shown only while scrolling, so
// with a mouse a wide table could not be moved at all otherwise.
export function useDragScroll(wrapperRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }
    let scroller: HTMLElement | null = null
    let startX = 0
    let startLeft = 0
    let dragging = false

    const onMove = (event: PointerEvent) => {
      if (!scroller) {
        return
      }
      const dx = event.clientX - startX
      if (!dragging && Math.abs(dx) < DRAG_THRESHOLD_PX) {
        return
      }
      if (!dragging) {
        dragging = true
        scroller.style.cursor = 'grabbing'
        scroller.style.userSelect = 'none'
      }
      scroller.scrollLeft = startLeft - dx
    }
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      if (scroller) {
        scroller.style.cursor = ''
        scroller.style.userSelect = ''
      }
      if (dragging) {
        // the click that follows a drag belongs to the drag, not to whatever it landed on
        const swallow = (event: Event) => event.stopPropagation()
        window.addEventListener('click', swallow, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', swallow, true), 0)
      }
      dragging = false
      scroller = null
    }
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) {
        return
      }
      if ((event.target as HTMLElement).closest(INTERACTIVE)) {
        return
      }
      const el = wrapper.querySelector('.MuiDataGrid-virtualScroller') as HTMLElement | null
      if (!el || el.scrollWidth <= el.clientWidth) {
        return
      }
      scroller = el
      startX = event.clientX
      startLeft = el.scrollLeft
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', stop)
      window.addEventListener('pointercancel', stop)
    }

    wrapper.addEventListener('pointerdown', onDown)
    return () => {
      wrapper.removeEventListener('pointerdown', onDown)
      stop()
    }
  }, [wrapperRef])
}
