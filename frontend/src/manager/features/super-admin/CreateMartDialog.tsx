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
  ownerName: string
  ownerContact: string
}

const EMPTY_FORM: FormState = { martName: '', ownerName: '', ownerContact: '' }

// The "Create Mart" dialog: collects Mart name / Owner name / Owner contact, validates them
// client-side on submit, then reveals the one-time Mart code / Owner Staff ID / setup code
// exactly once. The reveal cannot be dismissed except via the explicit "Done" acknowledgement,
// and no trace of it remains once the dialog is reopened for a new Mart.
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

  function updateField(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      // Clear this field's stale validation message as soon as the user edits it, rather than
      // leaving it shown until the next submit.
      setFieldErrors((prev) => {
        if (prev[field] === undefined) {
          return prev
        }
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
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
    if (form.ownerName.trim() === '') {
      errors.ownerName = REQUIRED_MESSAGE
    }
    if (form.ownerContact.trim() === '') {
      errors.ownerContact = REQUIRED_MESSAGE
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
                label="Owner name"
                placeholder="e.g. Ayesha Khan"
                value={form.ownerName}
                onChange={updateField('ownerName')}
                error={fieldErrors.ownerName !== undefined}
                helperText={fieldErrors.ownerName}
                required
              />
              <InputField
                label="Owner contact"
                placeholder="e.g. phone or email"
                value={form.ownerContact}
                onChange={updateField('ownerContact')}
                error={fieldErrors.ownerContact !== undefined}
                helperText={fieldErrors.ownerContact}
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
