import { useEffect, useRef, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { StyledDialog } from '../../../shared/common/Dialog'
import { InputField } from '../../../shared/common/Inputs/InputField'
import { createMart, type CreateMartFieldErrors, type CreateMartSuccess } from '../../../shared/api/marts'
import {
  CNIC_PATTERN,
  CONTACT_PATTERN,
  EMAIL_PATTERN,
  INVALID_CNIC_MESSAGE,
  INVALID_CONTACT_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  REQUIRED_MESSAGE,
  formatCnic,
  mapCnicCursor,
} from '../../../shared/validation/personFields'

const GENERIC_CREATE_ERROR = 'Something went wrong. Try again.'

type CreateMartDialogProps = {
  open: boolean
  // Called when the dialog is dismissed without a successful create (e.g. Cancel).
  onClose: () => void
  // Called once the one-time reveal has been explicitly acknowledged (Done). The caller should
  // close the dialog and refresh the Marts list.
  onCreated: () => void
}

type FormState = {
  martName: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerContact: string
  ownerCnic: string
}

const EMPTY_FORM: FormState = {
  martName: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerContact: '',
  ownerCnic: '',
}

// The "Create Mart" dialog: collects Mart name plus the Owner's first name, last name, email,
// contact number and CNIC, validates them client-side on submit (required-ness for every field,
// plus format checks for Email/Contact/CNIC), then reveals the one-time Mart code / Owner Staff
// ID / setup code exactly once. The reveal cannot be dismissed except via the explicit "Done"
// acknowledgement, and no trace of it remains once the dialog is reopened for a new Mart.
export function CreateMartDialog({ open, onClose, onCreated }: CreateMartDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<CreateMartFieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reveal, setReveal] = useState<CreateMartSuccess | null>(null)
  const cnicInputRef = useRef<HTMLInputElement>(null)
  const cnicCursorRef = useRef<number | null>(null)

  // Restores the cursor position computed in `updateCnic` after the formatted value re-renders —
  // a controlled input would otherwise reset the caret to the end on every keystroke.
  useEffect(() => {
    if (cnicCursorRef.current !== null) {
      cnicInputRef.current?.setSelectionRange(cnicCursorRef.current, cnicCursorRef.current)
      cnicCursorRef.current = null
    }
  }, [form.ownerCnic])

  function resetState() {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setServerError(null)
    setSubmitting(false)
    setReveal(null)
  }

  function handleCancel() {
    resetState()
    onClose()
  }

  function handleDone() {
    resetState()
    onCreated()
  }

  function clearFieldError(field: keyof FormState) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateField(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      // Clear this field's stale validation message as soon as the user edits it, rather than
      // leaving it shown until the next submit.
      clearFieldError(field)
    }
  }

  function updateCnic(event: React.ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value
    const rawCursor = event.target.selectionStart ?? rawValue.length
    const formatted = formatCnic(rawValue)
    cnicCursorRef.current = mapCnicCursor(rawValue, rawCursor, formatted)
    setForm((prev) => ({ ...prev, ownerCnic: formatted }))
    clearFieldError('ownerCnic')
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    if (submitting) {
      return
    }

    const errors: CreateMartFieldErrors = {}
    if (form.martName.trim() === '') {
      errors.martName = REQUIRED_MESSAGE
    }
    if (form.ownerFirstName.trim() === '') {
      errors.ownerFirstName = REQUIRED_MESSAGE
    }
    if (form.ownerLastName.trim() === '') {
      errors.ownerLastName = REQUIRED_MESSAGE
    }
    if (form.ownerEmail.trim() === '') {
      errors.ownerEmail = REQUIRED_MESSAGE
    } else if (!EMAIL_PATTERN.test(form.ownerEmail.trim())) {
      errors.ownerEmail = INVALID_EMAIL_MESSAGE
    }
    if (form.ownerContact.trim() === '') {
      errors.ownerContact = REQUIRED_MESSAGE
    } else if (!CONTACT_PATTERN.test(form.ownerContact.trim())) {
      errors.ownerContact = INVALID_CONTACT_MESSAGE
    }
    if (form.ownerCnic.trim() === '') {
      errors.ownerCnic = REQUIRED_MESSAGE
    } else if (!CNIC_PATTERN.test(form.ownerCnic.trim())) {
      errors.ownerCnic = INVALID_CNIC_MESSAGE
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await createMart(form)
    setSubmitting(false)

    if (result.ok) {
      setReveal(result.mart)
      return
    }
    if (result.reason === 'validation') {
      if (Object.keys(result.errors).length === 0) {
        // No usable per-field messages: fall back to the generic error rather than going silent.
        setServerError(GENERIC_CREATE_ERROR)
        return
      }
      setFieldErrors(result.errors)
      return
    }
    setServerError(GENERIC_CREATE_ERROR)
  }

  // While the one-time reveal is showing, it cannot be dismissed except via "Done". While a
  // submit is in flight (Save/Cancel both disabled), Escape/backdrop/the header close button are
  // blocked too.
  function guardedClose() {
    if (reveal !== null || submitting) {
      return
    }
    handleCancel()
  }

  if (reveal !== null) {
    return (
      <StyledDialog
        isOpen={open}
        onClose={guardedClose}
        onSubmit={handleDone}
        title="Mart created"
        maxWidth="tablet"
        actions={
          <Button onClick={handleDone} variant="contained" autoFocus>
            Done
          </Button>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Write these down now — they are shown only once and cannot be retrieved again.
        </Typography>
        <Stack spacing={1.5}>
          <Typography>
            <strong>Mart code:</strong> {reveal.martCode}
          </Typography>
          <Typography>
            <strong>Owner Staff ID:</strong> {reveal.ownerStaffId}
          </Typography>
          <Typography>
            <strong>Setup code:</strong> {reveal.setupCode}
          </Typography>
        </Stack>
      </StyledDialog>
    )
  }

  return (
    <StyledDialog
      isOpen={open}
      onClose={guardedClose}
      onSubmit={() => void submit()}
      title="Create Mart"
      maxWidth="tablet"
      loading={submitting}
      confirmText="Save"
    >
      <Box component="form" onSubmit={handleFormSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <InputField
          label="Mart name"
          placeholder="e.g. Downtown Mart"
          value={form.martName}
          onChange={updateField('martName')}
          error={fieldErrors.martName !== undefined}
          helperText={fieldErrors.martName}
          required
          autoFocus
        />
        <Box sx={{ display: 'flex', gap: 2.5 }}>
          <InputField
            label="First name"
            placeholder="e.g. Ayesha"
            value={form.ownerFirstName}
            onChange={updateField('ownerFirstName')}
            error={fieldErrors.ownerFirstName !== undefined}
            helperText={fieldErrors.ownerFirstName}
            required
            sx={{ flex: 1, minWidth: 0 }}
          />
          <InputField
            label="Last name"
            placeholder="e.g. Khan"
            value={form.ownerLastName}
            onChange={updateField('ownerLastName')}
            error={fieldErrors.ownerLastName !== undefined}
            helperText={fieldErrors.ownerLastName}
            required
            sx={{ flex: 1, minWidth: 0 }}
          />
        </Box>
        <InputField
          label="Email"
          type="email"
          placeholder="e.g. owner@example.com"
          value={form.ownerEmail}
          onChange={updateField('ownerEmail')}
          error={fieldErrors.ownerEmail !== undefined}
          helperText={fieldErrors.ownerEmail}
          required
        />
        <InputField
          label="Contact"
          placeholder="e.g. +923001234567"
          value={form.ownerContact}
          onChange={updateField('ownerContact')}
          error={fieldErrors.ownerContact !== undefined}
          helperText={fieldErrors.ownerContact}
          required
        />
        <InputField
          label="CNIC"
          placeholder="e.g. 12345-1234567-1"
          value={form.ownerCnic}
          onChange={updateCnic}
          error={fieldErrors.ownerCnic !== undefined}
          helperText={fieldErrors.ownerCnic}
          required
          inputRef={cnicInputRef}
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
