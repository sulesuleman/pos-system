import { useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { InputField } from '../../../shared/common/Inputs/InputField'
import { ThemeToggleButton } from '../../../shared/common/Buttons/ThemeToggleButton'
import { getSession, signIn } from '../../../shared/api/ownerAuth'

const GENERIC_CREDENTIALS_ERROR = "That Mart code, email or password isn't right."
const GENERIC_SERVER_ERROR = 'Something went wrong. Try again.'

export function OwnerSignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const [checkingSession, setCheckingSession] = useState(true)
  const [martCode, setMartCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Shown once, right after activation redirects here - not persisted, so a reload clears it.
  const justActivated = (location.state as { activated?: boolean } | null)?.activated === true

  // If already authenticated, redirect to /owner immediately instead of showing the form.
  useEffect(() => {
    let active = true
    void getSession().then((result) => {
      if (!active) {
        return
      }
      if (result.ok) {
        navigate('/owner', { replace: true })
        return
      }
      setCheckingSession(false)
    })
    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signIn(martCode.trim(), email.trim(), password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/owner', { replace: true })
      return
    }
    setPassword('')
    setError(result.reason === 'invalid-credentials' ? GENERIC_CREDENTIALS_ERROR : GENERIC_SERVER_ERROR)
  }

  if (checkingSession) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 400 }} role="status" aria-label="Loading sign-in">
          <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="90%" height={24} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={48} />
        </Box>
      </Box>
    )
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
            Run your Mart from one place.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 420 }}>
            Sign in to manage your Mart, branches and staff.
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
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Typography
              variant="overline"
              sx={{ display: 'block', letterSpacing: 3, color: 'text.secondary', fontWeight: 600, mb: 1 }}
            >
              Mart Access
            </Typography>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
              Owner sign in
            </Typography>
            <Box sx={{ width: 40, height: 3, borderRadius: 1.5, bgcolor: 'primary.main', my: 2.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Enter your Mart code, email and password to continue.
            </Typography>

            {justActivated && (
              <Typography
                variant="body2"
                color="success.main"
                sx={{ mb: 3 }}
                data-testid="owner-sign-in-activated-banner"
              >
                Account activated. Sign in with your new password.
              </Typography>
            )}

            <Stack component="form" spacing={3} onSubmit={(event) => void handleSubmit(event)} noValidate>
              <InputField
                label="Mart code"
                placeholder="e.g. 4F7K2Q"
                value={martCode}
                onChange={(event) => setMartCode(event.target.value)}
                autoFocus
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-sign-in-mart-code-input' } }}
              />
              <InputField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-sign-in-email-input' } }}
              />
              <InputField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                slotProps={{ htmlInput: { 'data-testid': 'owner-sign-in-password-input' } }}
              />
              {error !== null && (
                <Typography role="alert" color="error" variant="body2" data-testid="owner-sign-in-error">
                  {error}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting}
                aria-label="Sign in"
                data-testid="owner-sign-in-submit-button"
                sx={{ py: 1.5, letterSpacing: 1, fontWeight: 600 }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
              First time here?{' '}
              <Link component={RouterLink} to="/auth/activate" data-testid="owner-sign-in-activate-link">
                Activate your account
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
