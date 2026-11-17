import { useEffect, type MouseEvent, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import { useBottomDrawerStyles } from './useBottomDrawerStyles'

export type BottomDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Fixed by default; pass a `calc()`/`dvh` string for a viewport-relative drawer. */
  height?: number | string
  minHeight?: number | string
  maxHeight?: number | string
  /** Optional header: an icon/title/description row, shown only when at least one is given. */
  title?: string
  titleIcon?: ReactNode
  description?: string
  /** Footer content (e.g. action buttons). The last child is pinned full-width above the rest. */
  actions?: ReactNode
  /** Extra styles merged onto the body - the drawer keeps its own responsive padding. */
  contentSx?: SxProps<Theme>
}

// Keeps the layout viewport's keyboard inset in a `--kb` CSS var while `on`, so the sheet can
// stay lifted above the on-screen keyboard instead of hiding behind it.
function useKeyboardInset(on: boolean) {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!on || !viewport) {
      return undefined
    }
    const root = document.documentElement
    const write = () => {
      root.style.setProperty('--kb', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`)
    }
    write()
    viewport.addEventListener('resize', write)
    viewport.addEventListener('scroll', write)
    return () => {
      viewport.removeEventListener('resize', write)
      viewport.removeEventListener('scroll', write)
      root.style.removeProperty('--kb')
    }
  }, [on])
}

// A bottom sheet: props in, UI out, usable from either entry point. Plain Drawer, not
// SwipeableDrawer - swipe-to-open bought nothing here and cost a real bug (SwipeableDrawer's
// touch handling can close the backdrop on touchstart, before the browser's synthesized click
// fires, so that click lands on whatever is now revealed underneath instead of being absorbed
// by the backdrop).
export function BottomDrawer({
  open,
  onClose,
  children,
  height = '50%',
  minHeight,
  maxHeight,
  title,
  titleIcon,
  description,
  actions,
  contentSx,
}: BottomDrawerProps) {
  const styles = useBottomDrawerStyles()
  useKeyboardInset(open)
  const contentSxArray = Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : []

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={(event, reason) => {
        // React re-dispatches a backdrop click up through the React tree this Drawer is written
        // in, not the DOM tree it's portaled into - stopping it here keeps it from also
        // triggering whatever's rendered behind the backdrop on screen.
        if (reason === 'backdropClick') {
          (event as MouseEvent).stopPropagation()
        }
        onClose()
      }}
      slotProps={{ paper: { sx: [styles.paper, { height, minHeight, maxHeight }] } }}
    >
      <Box sx={styles.handleWrapper}>
        <Box sx={styles.handle} />
      </Box>

      {(title || titleIcon || description) && (
        <Box sx={styles.header}>
          {titleIcon}
          <Box sx={styles.headerText}>
            {title && (
              <Typography variant="h6" component="h2" sx={styles.headerTitle}>
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="caption" component="p" sx={styles.headerDescription}>
                {description}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box sx={[styles.content, ...contentSxArray]}>{children}</Box>

      {actions && <Box sx={styles.footer}>{actions}</Box>}
    </Drawer>
  )
}
