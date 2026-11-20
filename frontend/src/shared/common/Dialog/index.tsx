import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme, type Breakpoint, type SxProps, type Theme } from '@mui/material/styles'
import { BottomDrawer } from '../BottomDrawer'
import { StyledButton } from '../Buttons/StyledButton'
import { useStyledDialogStyles } from './useStyledDialogStyles'

export type StyledDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  loading?: boolean
  title: string
  confirmText?: string
  cancelText?: string
  children: ReactNode
  maxWidth?: Breakpoint
  disableActions?: boolean
  fullHeight?: boolean
  /** Replaces the default Confirm/Cancel footer entirely. Not used with `submitDisabled`. */
  actions?: ReactNode
  titleIcon?: ReactNode
  /** One line under the title, in the smallest type - switches the header into an icon+title+
   * description layout instead of a plain icon+title row. */
  description?: string
  titleError?: boolean
  paperSx?: SxProps<Theme>
  /** Disables the default confirm button (e.g. nothing to submit yet). Not used with `actions`. */
  submitDisabled?: boolean
  /** Override for the body's own inner spacing. */
  contentSx?: SxProps<Theme>
  /** Fires once the close transition finishes - e.g. to reset form state only after the dialog
   * is fully off-screen, not while it's still animating out. */
  onExited?: () => void
}

// The app's one dialog: a desktop/tablet MUI Dialog that becomes a BottomDrawer sheet below
// `tablet`, so every screen gets the responsive behaviour, the keyboard inset and the safe-area
// padding for free instead of hand-rolling them per dialog. Props in, UI out - no page-specific
// copy or logic, usable from either entry point.
export function StyledDialog({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  maxWidth = 'tablet',
  disableActions = false,
  fullHeight = false,
  actions,
  titleIcon,
  description,
  titleError = false,
  paperSx,
  submitDisabled = false,
  contentSx,
  onExited,
}: StyledDialogProps) {
  const theme = useTheme()
  const styles = useStyledDialogStyles()
  const isMobile = useMediaQuery(theme.breakpoints.down('tablet'))

  const footer = disableActions
    ? undefined
    : (actions ?? (
        <>
          <StyledButton onClick={onClose} variant="outlined" size="large" disabled={loading}>
            {cancelText}
          </StyledButton>
          <StyledButton
            onClick={onSubmit}
            variant="contained"
            size="large"
            type="submit"
            loading={loading}
            disabled={submitDisabled}
          >
            {confirmText}
          </StyledButton>
        </>
      ))

  if (isMobile) {
    return (
      <BottomDrawer
        open={isOpen}
        onClose={onClose}
        title={title}
        titleIcon={titleIcon}
        description={description}
        actions={footer}
        height="auto"
        maxHeight={`calc(${fullHeight ? 95 : 90}dvh - var(--kb, 0px))`}
        contentSx={contentSx}
        onExited={onExited}
      >
        {children}
      </BottomDrawer>
    )
  }

  const paperSxArray = Array.isArray(paperSx) ? paperSx : paperSx ? [paperSx] : []
  const contentSxArray = Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : []

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        paper: { sx: [...(fullHeight ? [styles.paperFullHeight] : []), ...paperSxArray] },
        transition: { onExited },
      }}
    >
      <DialogTitle
        sx={[
          styles.titleRow,
          ...(description ? [styles.titleRowWithDescription] : []),
          ...(titleError ? [styles.titleError] : []),
        ]}
      >
        {description ? (
          <Box sx={[styles.titleBlock, styles.titleBlockWithDescription]}>
            {titleIcon}
            <Box sx={styles.titleText}>
              <Typography variant="h6" component="h2" sx={styles.titleHeading}>
                {title}
              </Typography>
              <Typography variant="caption" component="p" sx={styles.titleDescription}>
                {description}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={styles.titleBlock}>
            {titleIcon}
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
          </Box>
        )}
        <Box sx={styles.closeButtonRow}>
          <IconButton onClick={onClose} aria-label="Close" title="Close" size="xs">
            <CloseIcon fontSize="inherit" sx={{ color: theme.palette.action.disabled }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={[styles.content, ...(disableActions ? [styles.contentNoActions] : []), ...contentSxArray]}>
          {children}
        </Box>
      </DialogContent>

      {footer && <DialogActions>{footer}</DialogActions>}
    </Dialog>
  )
}
