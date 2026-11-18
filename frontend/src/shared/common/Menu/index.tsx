import { Fragment } from 'react'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu, { type MenuProps } from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import { StyledIconButton } from '../Buttons/StyledIconButton'
import { useStyledMenuStyles, type StyledMenuItemConfig } from './useStyledMenuStyles'

export type { StyledMenuItemConfig }

export type StyledMenuProps = Omit<MenuProps, 'children'> & {
  items: StyledMenuItemConfig[]
  /** A small text.secondary label above the items - e.g. a submenu's own title. */
  heading?: string
  /** Fixed menu width - 280 for an account/company/rail-style menu, 220 (the default) for
   * everything else. */
  width?: number
  /** Renders a built-in "more options" (⋮) trigger button right before the menu, so this can be
   * a fully self-contained button+menu unit instead of needing its own trigger element. */
  showTriggerButton?: boolean
  triggerButtonSize?: 'small' | 'medium' | 'large'
  onTriggerClick?: (event: React.MouseEvent<HTMLElement>) => void
}

// A themed, data-driven dropdown menu - a list of StyledMenuItemConfig rows instead of JSX
// children - for anywhere this app needs a Menu rather than reaching for MUI's bare
// Menu/MenuItem each time. Ported from the reference app's own SMenu
// (AccessAndControl.Frontend's menu/FMenu.tsx).
export function StyledMenu({
  items,
  heading,
  width = 220,
  showTriggerButton = false,
  triggerButtonSize = 'small',
  onTriggerClick,
  slotProps,
  anchorOrigin,
  transformOrigin,
  ...menuProps
}: StyledMenuProps) {
  const opensBelow = (anchorOrigin?.vertical ?? 'bottom') === 'bottom'
  const styles = useStyledMenuStyles({ width, opensBelow })

  // Only a plain object `paper` slot is merged (a function form isn't used by any caller today) -
  // same simplifying assumption this app's other shared components make for `sx`.
  const paperSlot = slotProps?.paper
  const paperObject = paperSlot != null && typeof paperSlot === 'object' ? paperSlot : undefined
  const paperSx = paperObject?.sx
  const paperSxObject = paperSx != null && typeof paperSx === 'object' && !Array.isArray(paperSx) ? paperSx : undefined

  return (
    <>
      {showTriggerButton && (
        <StyledIconButton size={triggerButtonSize} onClick={onTriggerClick} colorVariant="primary" title="More options">
          <MoreVertOutlinedIcon fontSize={triggerButtonSize === 'large' ? 'medium' : 'small'} />
        </StyledIconButton>
      )}

      <Menu
        anchorOrigin={anchorOrigin ?? { vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={transformOrigin ?? { vertical: 'top', horizontal: 'right' }}
        {...menuProps}
        slotProps={{
          ...slotProps,
          paper: { ...paperObject, sx: { ...styles.paper, ...paperSxObject } },
        }}
      >
        {heading && (
          <Typography variant="body2" sx={styles.heading}>
            {heading}
          </Typography>
        )}
        {items.map((item, index) => (
          <Fragment key={index}>
            <MenuItem onClick={item.onClick} disabled={item.disabled} title={item.title} sx={styles.item(item)}>
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <Typography variant="inherit" sx={styles.itemLabel}>
                {item.label}
              </Typography>
              {item.hasSubmenu && <ChevronRightOutlinedIcon fontSize="small" sx={styles.submenuChevron} />}
              {item.endIcon && <ListItemIcon sx={styles.endIcon}>{item.endIcon}</ListItemIcon>}
            </MenuItem>
            {item.divider && <Divider sx={styles.divider} />}
          </Fragment>
        ))}
      </Menu>
    </>
  )
}
