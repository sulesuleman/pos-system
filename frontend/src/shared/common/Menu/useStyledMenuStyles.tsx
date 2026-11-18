import type { SxProps, Theme } from '@mui/material/styles'

export type StyledMenuItemConfig = {
  label: string
  icon?: React.ReactNode
  endIcon?: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  disabled?: boolean
  /** Shown as a native title/tooltip on the row itself. */
  title?: string
  /** Only 'error' changes anything today (a destructive action's label/icon/svg turn red) - any
   * other value reads as the default. */
  color?: string
  /** Highlighted and bolded - e.g. the current choice in a Light/Dark picker. */
  active?: boolean
  /** Draws a Divider right after this item. */
  divider?: boolean
  /** Shows a trailing chevron - this item opens a further StyledMenu of its own. */
  hasSubmenu?: boolean
}

// Style/sx objects for StyledMenu. Kept separate from index.tsx per this app's shared-component
// convention: a reusable component never inlines its styles.
export function useStyledMenuStyles({ width, opensBelow }: { width: number; opensBelow: boolean }) {
  const paper: SxProps<Theme> = {
    width,
    maxWidth: 'calc(100vw - 32px)',
    // A small gap under a trigger the menu opens below - a menu that opens beside its trigger
    // (e.g. a submenu, or any anchorOrigin not anchored to 'bottom') keeps its own side offset
    // instead, same distinction the reference's own `opensBelow` makes.
    ...(opensBelow && { mt: 0.75 }),
  }

  const heading: SxProps<Theme> = {
    color: 'text.secondary',
    px: 1,
    py: 0.75,
    display: 'block',
  }

  const item = (config: StyledMenuItemConfig): SxProps<Theme> => ({
    color: config.color === 'error' ? 'error.main' : 'inherit',
    backgroundColor: config.active ? 'action.selected' : 'transparent',
    fontWeight: config.active ? 600 : 400,
    '&:hover': {
      backgroundColor: config.active ? 'action.selected' : 'action.hover',
    },
    '& svg': {
      color: config.color === 'error' ? 'error.main' : 'inherit',
    },
  })

  const itemLabel: SxProps<Theme> = {
    flex: 1,
    minWidth: 0,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  }

  const submenuChevron: SxProps<Theme> = {
    ml: 'auto',
    color: 'inherit',
  }

  // The leading icon already gets its `minWidth: 28` from this app's own MuiMenuItem theme
  // override (shared/theme/overrides/components/menu.tsx) - only the trailing one needs its own
  // override, so it hugs the row's right edge instead of sitting at the same fixed width.
  const endIcon: SxProps<Theme> = {
    minWidth: 'unset',
    ml: 1,
    justifyContent: 'flex-end',
  }

  const divider: SxProps<Theme> = {
    mx: 0.5,
  }

  return { paper, heading, item, itemLabel, submenuChevron, endIcon, divider }
}
