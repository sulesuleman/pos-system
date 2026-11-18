import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { InputField } from '../../../../shared/common/Inputs/InputField'
import type { CreateBranchFieldErrors } from '../../../../shared/api/branches'

const GENERIC_SAVE_ERROR = 'Something went wrong. Try again.'
const REQUIRED_MESSAGE = 'This field is required.'

export type BranchFormValues = {
  name: string
  location: string
  timeZone: string
}

const EMPTY_FORM: BranchFormValues = {
  name: '',
  location: '',
  // FR-26's default - most Branches won't need to change it.
  timeZone: 'Asia/Karachi',
}

type BranchFormDialogProps = {
  open: boolean
  title: string
  confirmText: string
  // Pre-fills the form (editing an existing Branch). Omit to start from a blank "create" form.
  initialValues?: BranchFormValues
  onClose: () => void
  onSubmit: (values: BranchFormValues) => Promise<
    { ok: true } | { ok: false; reason: 'validation'; errors: CreateBranchFieldErrors } | { ok: false; reason: 'error' }
  >
  onSaved: () => void
}

// Shared form for both "Create Branch" and "Edit Branch" - same fields (FR-26: name, location,
// time zone), same validation, same error-handling shape. The two call sites differ only in
// title/confirm text, initial values and which API call `onSubmit` wraps.
//
// The caller remounts this component (via a changing `key`) whenever it should start from a
// different Branch or a blank form, rather than this component re-syncing its own state from
// props in an effect - the state only ever needs to be set once, at mount.
export function BranchFormDialog({ open, title, confirmText, initialValues, onClose, onSubmit, onSaved }: BranchFormDialogProps) {
  const [form, setForm] = useState<BranchFormValues>(() => initialValues ?? EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<CreateBranchFieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function clearFieldError(field: keyof BranchFormValues) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateField(field: keyof BranchFormValues) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      clearFieldError(field)
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    if (submitting) {
      return
    }

    const errors: CreateBranchFieldErrors = {}
    if (form.name.trim() === '') {
      errors.name = REQUIRED_MESSAGE
    }
    if (form.location.trim() === '') {
      errors.location = REQUIRED_MESSAGE
    }
    if (form.timeZone.trim() === '') {
      errors.timeZone = REQUIRED_MESSAGE
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await onSubmit(form)
    setSubmitting(false)

    if (result.ok) {
      onSaved()
      return
    }
    if (result.reason === 'validation') {
      if (Object.keys(result.errors).length === 0) {
        setServerError(GENERIC_SAVE_ERROR)
        return
      }
      setFieldErrors(result.errors)
      return
    }
    setServerError(GENERIC_SAVE_ERROR)
  }

  function guardedClose() {
    if (submitting) {
      return
    }
    onClose()
  }

  return (
    <StyledDialog
      isOpen={open}
      onClose={guardedClose}
      onSubmit={() => void submit()}
      title={title}
      maxWidth="tablet"
      loading={submitting}
      confirmText={confirmText}
    >
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <InputField
          label="Branch name"
          placeholder="e.g. Downtown"
          value={form.name}
          onChange={updateField('name')}
          error={fieldErrors.name !== undefined}
          helperText={fieldErrors.name}
          required
          autoFocus
        />
        <InputField
          label="Location"
          placeholder="e.g. 12 Mall Road, Lahore"
          value={form.location}
          onChange={updateField('location')}
          error={fieldErrors.location !== undefined}
          helperText={fieldErrors.location}
          required
        />
        <InputField
          label="Time zone"
          placeholder="e.g. Asia/Karachi"
          value={form.timeZone}
          onChange={updateField('timeZone')}
          error={fieldErrors.timeZone !== undefined}
          helperText={fieldErrors.timeZone ?? 'IANA time zone name, e.g. Asia/Karachi.'}
          required
        />
        {serverError !== null && (
          <Typography role="alert" color="error" variant="body2">
            {serverError}
          </Typography>
        )}
      </Box>
    </StyledDialog>
  )
}
