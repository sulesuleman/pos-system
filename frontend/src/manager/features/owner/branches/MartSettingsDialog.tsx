import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { InputField } from '../../../../shared/common/Inputs/InputField'
import {
  getMartSettings,
  updateMartSettings,
  type MartSettings,
  type MartSettingsFieldErrors,
} from '../../../../shared/api/martSettings'

const GENERIC_LOAD_ERROR = 'Something went wrong loading Mart settings.'
const GENERIC_SAVE_ERROR = 'Something went wrong. Try again.'
const REQUIRED_MESSAGE = 'This field is required.'

type MartSettingsDialogProps = {
  open: boolean
  onClose: () => void
}

// Mart-wide settings (FR-26): currency, default time zone (used for Mart-wide reports, AD-12)
// and the long-pending Return threshold in minutes (FR-19, default 30). Owner-only.
export function MartSettingsDialog({ open, onClose }: MartSettingsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [form, setForm] = useState<MartSettings | null>(null)
  const [fieldErrors, setFieldErrors] = useState<MartSettingsFieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const activeRef = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    setFieldErrors({})
    setServerError(null)
    void getMartSettings().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setLoadError(true)
        return
      }
      setForm(result.settings)
    })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    // Deliberate exception to react-hooks/set-state-in-effect: this is the "fetch when a dialog
    // opens" case the rule's own guidance calls out as legitimate (subscribing to an external
    // system - the server - and setting state from its response), not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [open, load])

  function updateField(field: keyof MartSettings) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => (prev === null ? prev : { ...prev, [field]: event.target.value }))
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

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    if (form === null || submitting) {
      return
    }

    const errors: MartSettingsFieldErrors = {}
    if (form.currency.trim() === '') {
      errors.currency = REQUIRED_MESSAGE
    }
    if (form.defaultTimeZone.trim() === '') {
      errors.defaultTimeZone = REQUIRED_MESSAGE
    }
    const minutes = Number(form.longPendingReturnMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      errors.longPendingReturnMinutes = 'Enter a whole number of minutes greater than 0.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await updateMartSettings({ ...form, longPendingReturnMinutes: minutes })
    setSubmitting(false)

    if (result.ok) {
      onClose()
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
      title="Mart settings"
      maxWidth="tablet"
      loading={submitting}
      confirmText="Save"
      submitDisabled={loading || loadError || form === null}
    >
      {loading && (
        <Box role="status" aria-label="Loading Mart settings">
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={56} />
        </Box>
      )}
      {!loading && loadError && (
        <Typography role="alert" color="error">
          {GENERIC_LOAD_ERROR}
        </Typography>
      )}
      {!loading && !loadError && form !== null && (
        <Box
          component="form"
          onSubmit={handleFormSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <InputField
            label="Currency"
            placeholder="e.g. PKR"
            value={form.currency}
            onChange={updateField('currency')}
            error={fieldErrors.currency !== undefined}
            helperText={fieldErrors.currency}
            required
            autoFocus
          />
          <InputField
            label="Default time zone"
            placeholder="e.g. Asia/Karachi"
            value={form.defaultTimeZone}
            onChange={updateField('defaultTimeZone')}
            error={fieldErrors.defaultTimeZone !== undefined}
            helperText={fieldErrors.defaultTimeZone ?? 'Used for Mart-wide reports.'}
            required
          />
          <InputField
            label="Long-pending Return threshold (minutes)"
            type="number"
            value={form.longPendingReturnMinutes}
            onChange={updateField('longPendingReturnMinutes')}
            error={fieldErrors.longPendingReturnMinutes !== undefined}
            helperText={fieldErrors.longPendingReturnMinutes ?? 'A pending Return older than this is flagged (default 30).'}
            required
          />
          {serverError !== null && (
            <Typography role="alert" color="error" variant="body2">
              {serverError}
            </Typography>
          )}
        </Box>
      )}
    </StyledDialog>
  )
}
