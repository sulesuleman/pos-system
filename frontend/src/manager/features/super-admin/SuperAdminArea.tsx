import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { StyledButton } from '../../../shared/common/Buttons/StyledButton'
import { StyledDialog } from '../../../shared/common/Dialog'
import { usePageHeader } from '../../layout/pageHeaderStore'
import { suspendMart, reactivateMart, type Mart } from '../../../shared/api/marts'
import { MartsList, type MartsListHandle } from './MartsList'
import { CreateMartDialog } from './CreateMartDialog'

const GENERIC_ACTION_ERROR = 'Something went wrong. Try again.'

// The Super Admin area's landing screen: the Marts list (name, code, status only — the Super
// Admin API never exposes a Mart's business data), the "Create Mart" flow, and Suspend/Reactivate
// per Mart (Story 1.7, FR-25). Suspending blocks every sign-in and already-signed-in request for
// that Mart "on next contact" (server-enforced - see MartsEndpoints.cs), so it's confirmed the
// same way Branches' own Deactivate is; reactivating restores access immediately and is lower-
// risk (reversible by suspending again), so it runs straight from the list row instead.
export function SuperAdminArea() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [suspendingMart, setSuspendingMart] = useState<Mart | null>(null)
  const [suspending, setSuspending] = useState(false)
  const [suspendError, setSuspendError] = useState<string | null>(null)
  // The one Mart whose Suspend/Reactivate call is in flight - covers both actions, since only
  // one row's action can be pending at a time.
  const [pendingMartId, setPendingMartId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const martsListRef = useRef<MartsListHandle>(null)

  usePageHeader({
    heading: 'Marts',
    subheading: 'Every Mart on the platform, and where to register a new one.',
    icon: <StorefrontOutlinedIcon />,
    rightContent: (
      // size="large" matches the reference app's own convention for a page-header's action
      // button (its SButton usage on PageLayout's rightContent slot).
      <StyledButton variant="contained" size="large" onClick={() => setDialogOpen(true)}>
        Create Mart
      </StyledButton>
    ),
  })

  function handleCreated() {
    setDialogOpen(false)
    martsListRef.current?.refresh()
  }

  function handleSuspendClick(mart: Mart) {
    setActionError(null)
    setSuspendError(null)
    setSuspendingMart(mart)
  }

  async function handleConfirmSuspend() {
    if (suspendingMart === null || suspending) {
      return
    }
    setSuspending(true)
    setSuspendError(null)
    const result = await suspendMart(suspendingMart.id)
    setSuspending(false)
    if (!result.ok) {
      setSuspendError(
        result.reason === 'conflict' ? `${suspendingMart.name} is already suspended.` : GENERIC_ACTION_ERROR,
      )
      return
    }
    setSuspendingMart(null)
    martsListRef.current?.refresh()
  }

  async function handleReactivate(mart: Mart) {
    if (pendingMartId !== null) {
      return
    }
    setActionError(null)
    setPendingMartId(mart.id)
    const result = await reactivateMart(mart.id)
    setPendingMartId(null)
    if (!result.ok) {
      setActionError(result.reason === 'conflict' ? `${mart.name} is already active.` : GENERIC_ACTION_ERROR)
      return
    }
    martsListRef.current?.refresh()
  }

  return (
    <Box data-testid="super-admin-area">
      {actionError !== null && (
        <Typography role="alert" color="error" variant="body2" sx={{ mb: 2 }}>
          {actionError}
        </Typography>
      )}

      <MartsList
        ref={martsListRef}
        onSuspend={handleSuspendClick}
        onReactivate={(mart) => void handleReactivate(mart)}
        pendingMartId={pendingMartId}
      />

      <CreateMartDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />

      <StyledDialog
        isOpen={suspendingMart !== null}
        onClose={() => (suspending ? undefined : setSuspendingMart(null))}
        onSubmit={() => void handleConfirmSuspend()}
        title="Suspend Mart"
        maxWidth="phoneSm"
        loading={suspending}
        confirmText="Suspend"
      >
        <Typography variant="body2">
          {suspendingMart?.name} and its staff will no longer be able to sign in until reactivated. This can be
          undone at any time.
        </Typography>
        {suspendError !== null && (
          <Typography role="alert" color="error" variant="body2" sx={{ mt: 1.5 }}>
            {suspendError}
          </Typography>
        )}
      </StyledDialog>
    </Box>
  )
}
