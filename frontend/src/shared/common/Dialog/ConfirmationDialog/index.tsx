import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ButtonProps } from '@mui/material/Button'
import { StyledButton } from '../../Buttons/StyledButton'
import { InputField } from '../../Inputs/InputField'
import { StyledDialog } from '../index'

export type ConfirmationDialogVariant = 'discard' | 'delete' | 'warning' | 'success' | 'reopen'

export type ConfirmationDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm?: (comment?: string) => void
  loading?: boolean
  actionText?: string
  screenName?: string
  /** Shows a "Reason" text field and passes its value to `onConfirm`. */
  haveReason?: boolean
  customMessage?: ReactNode
  variant?: ConfirmationDialogVariant
  confirmButtonText?: string
  cancelButtonText?: string
  /** Shown under the message when the confirmed action itself failed (e.g. a conflict from the
   * server) - cleared by the caller before the next attempt. */
  errorMessage?: string | null
}

const CONFIRM_COLOR: Record<ConfirmationDialogVariant, ButtonProps['color']> = {
  delete: 'error',
  warning: 'warning',
  success: 'success',
  reopen: 'inherit',
  discard: 'primary',
}

const DEFAULT_CONFIRM_TEXT: Record<ConfirmationDialogVariant, string> = {
  delete: 'Delete',
  discard: 'Discard',
  warning: 'Confirm',
  success: 'Approve',
  reopen: 'Reopen',
}

const DEFAULT_MESSAGE: Record<ConfirmationDialogVariant, string> = {
  delete: "This action can't be undone.",
  discard: 'Any unsaved changes will be lost.',
  warning: 'Are you sure you want to continue?',
  success: 'Are you sure you want to continue?',
  reopen: 'Are you sure you want to continue?',
}

// A generic confirm/cancel dialog for destructive or otherwise non-trivial actions (delete,
// discard, approve, reopen, ...) - one body line plus an optional "Reason" field, instead of
// every caller writing its own small confirm dialog. Built on the shared StyledDialog so it gets
// the same desktop/mobile behaviour for free.
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  actionText = '',
  screenName = '',
  haveReason = false,
  customMessage,
  variant = 'delete',
  confirmButtonText,
  cancelButtonText,
  errorMessage,
}: ConfirmationDialogProps) {
  const [comment, setComment] = useState('')

  const title = actionText && screenName ? `${actionText} ${screenName}` : 'Confirm action'

  function submit() {
    onConfirm?.(haveReason ? comment : undefined)
  }

  return (
    <StyledDialog
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={submit}
      title={title}
      maxWidth="xs"
      loading={loading}
      actions={
        <>
          <StyledButton onClick={onClose} color="inherit" variant="outlined" size="medium" disabled={loading}>
            {cancelButtonText || 'Cancel'}
          </StyledButton>
          <StyledButton
            onClick={submit}
            size="medium"
            variant="contained"
            color={CONFIRM_COLOR[variant]}
            loading={loading}
            type="submit"
            autoFocus
          >
            {confirmButtonText || DEFAULT_CONFIRM_TEXT[variant]}
          </StyledButton>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {customMessage || DEFAULT_MESSAGE[variant]}
        </Typography>
        {haveReason && (
          <InputField
            label="Reason"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            multiline
            minRows={3}
            size="small"
            fullWidth
          />
        )}
        {errorMessage != null && (
          <Typography role="alert" color="error" variant="body2">
            {errorMessage}
          </Typography>
        )}
      </Box>
    </StyledDialog>
  )
}
