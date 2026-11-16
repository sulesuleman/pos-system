import { useCallback, useRef, useState, type ReactNode } from 'react'
import Tooltip, { type TooltipProps } from '@mui/material/Tooltip'
import Typography, { type TypographyProps } from '@mui/material/Typography'
import { useOverflowTooltipStyles } from './useOverflowTooltipStyles'

export type OverflowTooltipProps = Omit<TypographyProps, 'children' | 'title'> & {
  /** The (single-line) text to render. Truncated with an ellipsis when it doesn't fit. */
  text: ReactNode
  /** Tooltip content; defaults to `text`. */
  title?: ReactNode
  /** Extra props forwarded to the MUI Tooltip (placement, arrow, ...). */
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>
}

// Single-line text that truncates with an ellipsis and shows the full text in a tooltip on
// hover - but only when it's actually overflowing (scrollWidth > clientWidth), so short values
// never get a redundant tooltip. Use anywhere long text may be cut off (grid cells, cards).
export function OverflowTooltip({ text, title, tooltipProps, onMouseEnter, sx, ...typographyProps }: OverflowTooltipProps) {
  const styles = useOverflowTooltipStyles()
  const ref = useRef<HTMLElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const sxArray = Array.isArray(sx) ? sx : sx ? [sx] : []

  const handleMouseEnter = useCallback<NonNullable<TypographyProps['onMouseEnter']>>(
    (event) => {
      const el = ref.current
      if (el) {
        setIsOverflowing(el.scrollWidth > el.clientWidth)
      }
      onMouseEnter?.(event)
    },
    [onMouseEnter],
  )

  const tooltipTitle = title ?? text

  return (
    <Tooltip disableInteractive {...tooltipProps} title={isOverflowing && tooltipTitle != null ? tooltipTitle : ''}>
      <Typography ref={ref} noWrap onMouseEnter={handleMouseEnter} sx={[styles.text, ...sxArray]} {...typographyProps}>
        {text}
      </Typography>
    </Tooltip>
  )
}
