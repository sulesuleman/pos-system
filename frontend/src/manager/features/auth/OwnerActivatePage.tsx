import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { InputField } from '../../../shared/common/Inputs/InputField'
import { ThemeToggleButton } from '../../../shared/common/Buttons/ThemeToggleButton'
import { activate } from '../../../shared/api/ownerAuth'

const GENERIC_ACTIVATE_ERROR = "That Mart code, email or setup code isn't right."
const GENERIC_SERVER_ERROR = 'Something went wrong. Try again.'
const REQUIRED_MESSAGE = 'This field is required.'
const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.'
const WEAK_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include a number, a special character, an uppercase and a lowercase letter.'

// A well-formed-enough email address: something@something.something, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Mirrors the backend's complexity rule exactly: 8+ chars, a digit, a special character, an
// uppercase and a lowercase letter - checked client-side too so a weak password never needs a
// round trip to be rejected.
const PASSWORD_PATTERN = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])(?=.*[a-z])(?=.*[A-Z]).{8,}$/

type FormState = {
  martCode: string
  email: string
  setupCode: string
  password: string
}

const EMPTY_FORM: FormState = { martCode: '', email: '', setupCode: '', password: '' }

type FieldErrors = Partial<Record<keyof FormState, string>>

// The Owner's one-time activation screen: Mart code + email (handed to them by the Super Admin
// along with the setup code when the Mart was created) plus the setup code itself, and a new
// password. Unlike sign-in, the password's complexity is checked client-side before the round
// trip, since that rejection reason is safe to reveal (unlike which part of the Mart/email/setup
// code triple was wrong).
export function OwnerActivatePage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    const errors: FieldErrors = {}
    if (form.martCode.trim() === '') {
      errors.martCode = REQUIRED_MESSAGE
    }
    if (form.email.trim() === '') {
      errors.email = REQUIRED_MESSAGE
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = INVALID_EMAIL_MESSAGE
    }
    if (form.setupCode.trim() === '') {
      errors.setupCode = REQUIRED_MESSAGE
    }
    if (form.password === '') {
      errors.password = REQUIRED_MESSAGE
    } else if (!PASSWORD_PATTERN.test(form.password)) {
      errors.password = WEAK_PASSWORD_MESSAGE
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await activate(form.martCode.trim(), form.email.trim(), form.setupCode.trim(), form.password)
    setSubmitting(false)

    if (result.ok) {
      navigate('/auth/sign-in', { replace: true, state: { activated: true } })
      return
    }
    if (result.reason === 'weak-password') {
      setFieldErrors({ password: result.message })
      return
    }
    if (result.reason === 'invalid') {
      setServerError(GENERIC_ACTIVATE_ERROR)
    } else if (result.reason === 'mart-suspended') {
      setServerError(result.message)
    } else {
      setServerError(GENERIC_SERVER_ERROR)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: { xs: 'column', md: 'row' } }}>
      <Box
        sx={{
          flex: { md: '1 1 45%' },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: theme.palette.common.white,
          background: theme.palette.gradients.field,
        }}
      >
        <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
          POS System
        </Typography>
        <Box>
          <Typography variant="h2" sx={{ mb: 2 }}>
            Activate your Mart's Owner account.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 420 }}>
            Use the Mart code, email and setup code you were given to set your password and finish
            setting up your account.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Owner console
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 3, sm: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggleButton />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Typography
              variant="overline"
              sx={{ display: 'block', letterSpacing: 3, color: 'text.secondary', fontWeight: 600, mb: 1 }}
            >
              Account setup
            </Typography>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
              Activate your account
            </Typography>
            <Box sx={{ width: 40, height: 3, borderRadius: 1.5, bgcolor: 'primary.main', my: 2.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Enter the details you were given, then choose a password.
            </Typography>

            <Stack component="form" spacing={3} onSubmit={handleFormSubmit} noValidate>
              <InputField
                label="Mart code"
                placeholder="e.g. 4F7K2Q"
                value={form.martCode}
                onChange={updateField('martCode')}
                error={fieldErrors.martCode !== undefined}
                helperText={fieldErrors.martCode}
                autoFocus
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-activate-mart-code-input' } }}
              />
              <InputField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField('email')}
                autoComplete="username"
                error={fieldErrors.email !== undefined}
                helperText={fieldErrors.email}
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-activate-email-input' } }}
              />
              <InputField
                label="Setup code"
                placeholder="Enter the setup code you were given"
                value={form.setupCode}
                onChange={updateField('setupCode')}
                error={fieldErrors.setupCode !== undefined}
                helperText={fieldErrors.setupCode}
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-activate-setup-code-input' } }}
              />
              <InputField
                label="New password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField('password')}
                autoComplete="new-password"
                error={fieldErrors.password !== undefined}
                helperText={fieldErrors.password ?? '8+ characters, with a number, a special character, an uppercase and a lowercase letter.'}
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-activate-password-input' } }}
              />
              {serverError !== null && (
                <Typography role="alert" color="error" variant="body2" data-testid="owner-activate-error">
                  {serverError}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting}
                aria-label="Activate account"
                data-testid="owner-activate-submit-button"
                sx={{ py: 1.5, letterSpacing: 1, fontWeight: 600 }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Activate account'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
