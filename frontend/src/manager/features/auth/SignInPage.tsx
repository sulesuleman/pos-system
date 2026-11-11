import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { InputField } from '../../../shared/common/Inputs/InputField'
import { ThemeToggleButton } from '../../../shared/common/Buttons/ThemeToggleButton'
import { getSession, signIn } from '../../../shared/api/superAdminAuth'

const GENERIC_CREDENTIALS_ERROR = 'Incorrect email or password.'
const GENERIC_SERVER_ERROR = 'Something went wrong. Try again.'

export function SignInPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // If already authenticated, redirect to /super-admin immediately instead of showing the form.
  useEffect(() => {
    let active = true
    void getSession().then((result) => {
      if (!active) {
        return
      }
      if (result.ok) {
        navigate('/super-admin', { replace: true })
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
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/super-admin', { replace: true })
      return
    }
    setPassword('')
    setError(result.reason === 'invalid-credentials' ? GENERIC_CREDENTIALS_ERROR : GENERIC_SERVER_ERROR)
  }

  if (checkingSession) {
    // Shaped like the card about to appear below (title, two fields, a submit button) rather
    // than one centered spinner.
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 400 }} role="status" aria-label="Loading sign-in">
          <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="90%" height={24} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={48} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Hero panel: hidden on small screens, where the form alone fills the viewport */}
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
            Run every Mart from one place.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 420 }}>
            Sign in to manage Marts, staff, and platform settings from the Super Admin console.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Super Admin console
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 3, sm: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggleButton />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper
            sx={{
              width: '100%',
              maxWidth: 400,
              p: { xs: 3, sm: 5 },
              borderRadius: 3,
              boxShadow: theme.customShadows.z16,
            }}
          >
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Super Admin sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your platform credentials to continue.
            </Typography>
            <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)} noValidate>
              <InputField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
              <InputField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              {error !== null && (
                <Typography role="alert" color="error" variant="body2">
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
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
