import type { ReactNode } from 'react'
import IconButton, { type IconButtonProps } from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useStyledIconButtonStyles, type StyledIconButtonColor } from './useStyledIconButtonStyles'

export type { StyledIconButtonColor }

export type StyledIconButtonProps = Omit<IconButtonProps, 'color' | 'children'> & {
  children: ReactNode
  colorVariant?: StyledIconButtonColor
  /** Wraps the button in a Tooltip when given - also its accessible label, same as the
   * reference's own `title` prop. */
  title?: string
  showBackground?: boolean
  alphaValue?: number
}

// A tinted icon button - a soft wash of `colorVariant` behind an icon in its darker step, rather
// than MUI's own flat `color` prop - optionally wrapped in a Tooltip. Ported from the reference
// app's own SIconButton (AccessAndControl.Frontend's buttons/SIconButton.tsx).
export function StyledIconButton({
  children,
  colorVariant = 'primary',
  title,
  showBackground = true,
  alphaValue = 0.08,
  sx,
  ...props
}: StyledIconButtonProps) {
  // Only a plain object `sx` is inspected/merged (an array or function form isn't used by any
  // caller today) - same simplifying assumption the reference's own `hasCustomBackgroundColor`
  // check makes.
  const sxObject = sx != null && typeof sx === 'object' && !Array.isArray(sx) ? sx : undefined
  const hasCustomBackgroundColor = sxObject != null && 'backgroundColor' in sxObject
  const styles = useStyledIconButtonStyles({ colorVariant, showBackground, alphaValue, hasCustomBackgroundColor })

  const button = (
    <IconButton {...props} sx={{ ...styles.root, ...sxObject }}>
      {children}
    </IconButton>
  )

  if (!title) {
    return button
  }

  return (
    <Tooltip title={title} arrow placement="top">
      {/* A disabled IconButton swallows pointer events, which would also block the Tooltip - a
          span wrapper keeps the tooltip reachable either way. */}
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  )
}
