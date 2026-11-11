import { useState, type FormEvent } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { InputField } from '../../../shared/common/Inputs/InputField'
import { createMart, type CreateMartFieldErrors, type CreateMartSuccess } from '../../../shared/api/marts'

const GENERIC_CREATE_ERROR = 'Something went wrong. Try again.'
const REQUIRED_MESSAGE = 'This field is required.'
const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.'
const INVALID_CONTACT_MESSAGE = 'Enter a valid phone number.'
const INVALID_CNIC_MESSAGE = 'Enter a complete CNIC in the form 12345-1234567-1.'

// A well-formed-enough email address: something@something.something, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Digits, optional leading "+" for a country code, 7-15 digits total — lenient, not a strict
// carrier/region check.
const CONTACT_PATTERN = /^\+?\d{7,15}$/
// Canonical Pakistani CNIC shape: 5 digits, dash, 7 digits, dash, 1 digit.
const CNIC_PATTERN = /^\d{5}-\d{7}-\d{1}$/

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

// Strips everything but digits, keeps at most 13, and re-inserts dashes after the 5th and 12th
// digit — the canonical Pakistani CNIC shape (NNNNN-NNNNNNN-N), applied as the user types.
function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  const area = digits.slice(0, 5)
  const family = digits.slice(5, 12)
  const check = digits.slice(12, 13)
  let formatted = area
  if (family !== '') {
    formatted += `-${family}`
  }
  if (check !== '') {
    formatted += `-${check}`
  }
  return formatted
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
    setForm((prev) => ({ ...prev, ownerCnic: formatCnic(event.target.value) }))
    clearFieldError('ownerCnic')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  return (
    <Dialog
      open={open}
      onClose={() => {
        // While the one-time reveal is showing, it cannot be dismissed except via "Done". While
        // a submit is in flight (Save/Cancel both disabled), Escape/backdrop are blocked too.
        if (reveal !== null || submitting) {
          return
        }
        handleCancel()
      }}
      fullWidth
      maxWidth="xs"
    >
      {reveal === null ? (
        <>
          <DialogTitle>Create Mart</DialogTitle>
          <DialogContent>
            <Stack component="form" id="create-mart-form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)} noValidate>
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
              <InputField
                label="First name"
                placeholder="e.g. Ayesha"
                value={form.ownerFirstName}
                onChange={updateField('ownerFirstName')}
                error={fieldErrors.ownerFirstName !== undefined}
                helperText={fieldErrors.ownerFirstName}
                required
              />
              <InputField
                label="Last name"
                placeholder="e.g. Khan"
                value={form.ownerLastName}
                onChange={updateField('ownerLastName')}
                error={fieldErrors.ownerLastName !== undefined}
                helperText={fieldErrors.ownerLastName}
                required
              />
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
              />
              {serverError !== null && (
                <Typography role="alert" color="error" variant="body2">
                  {serverError}
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-mart-form"
              variant="contained"
              disabled={submitting}
              aria-label="Save"
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>Mart created</DialogTitle>
          <DialogContent>
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDone} variant="contained" autoFocus>
              Done
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
