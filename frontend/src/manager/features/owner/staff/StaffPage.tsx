import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import { StyledButton } from '../../../../shared/common/Buttons/StyledButton'
import { ConfirmationDialog } from '../../../../shared/common/Dialog/ConfirmationDialog'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { usePageHeader } from '../../../layout/pageHeaderStore'
import { StaffList, type StaffListHandle } from './StaffList'
import { CreateStaffDialog } from './CreateStaffDialog'
import { disableStaff, resetStaffCredentials, type StaffMember } from '../../../../shared/api/staff'

const GENERIC_ACTION_ERROR = 'Something went wrong. Try again.'
const UNAUTHORIZED_ERROR = "You don't have permission to do this for this staff member."

// The Owner's "Staff" screen (Story 2.2, FR-1 slice; Story 2.5's disable/reset added on top):
// the Mart's staff list plus the "Create Staff" flow that activates a new Manager, a Disable
// confirmation per row, and a Reset credentials confirmation that reveals a new one-time setup
// code on success. Mirrors SuperAdminArea/BranchesPage's own list-plus-dialog shape.
export function StaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [disablingStaff, setDisablingStaff] = useState<StaffMember | null>(null)
  const [disabling, setDisabling] = useState(false)
  const [disableError, setDisableError] = useState<string | null>(null)
  const [resettingStaff, setResettingStaff] = useState<StaffMember | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetReveal, setResetReveal] = useState<string | null>(null)
  const staffListRef = useRef<StaffListHandle>(null)

  usePageHeader({
    heading: 'Staff',
    subheading: 'Everyone with an account at this Mart, and where to add a new Manager.',
    icon: <GroupOutlinedIcon />,
    rightContent: (
      // size="large" matches this app's convention for a page-header's action button.
      <StyledButton variant="contained" size="large" onClick={() => setDialogOpen(true)}>
        Create Staff
      </StyledButton>
    ),
  })

  function handleCreated() {
    setDialogOpen(false)
    staffListRef.current?.refresh()
  }

  function handleDisableClick(staff: StaffMember) {
    setDisableError(null)
    setDisablingStaff(staff)
  }

  async function handleConfirmDisable() {
    if (disablingStaff === null || disabling) {
      return
    }
    setDisabling(true)
    setDisableError(null)
    const result = await disableStaff(disablingStaff.id)
    setDisabling(false)
    if (!result.ok) {
      setDisableError(result.reason === 'unauthorized' ? UNAUTHORIZED_ERROR : GENERIC_ACTION_ERROR)
      return
    }
    setDisablingStaff(null)
    staffListRef.current?.refresh()
  }

  function handleResetClick(staff: StaffMember) {
    setResetError(null)
    setResettingStaff(staff)
  }

  async function handleConfirmReset() {
    if (resettingStaff === null || resetting) {
      return
    }
    setResetting(true)
    setResetError(null)
    const result = await resetStaffCredentials(resettingStaff.id)
    setResetting(false)
    if (!result.ok) {
      setResetError(result.reason === 'unauthorized' ? UNAUTHORIZED_ERROR : GENERIC_ACTION_ERROR)
      return
    }
    setResettingStaff(null)
    setResetReveal(result.setupCode)
    staffListRef.current?.refresh()
  }

  return (
    <Box data-testid="staff-page">
      <StaffList ref={staffListRef} onDisable={handleDisableClick} onResetCredentials={handleResetClick} />
      <CreateStaffDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />

      <ConfirmationDialog
        isOpen={disablingStaff !== null}
        onClose={() => (disabling ? undefined : setDisablingStaff(null))}
        onConfirm={() => void handleConfirmDisable()}
        loading={disabling}
        variant="discard"
        confirmButtonText="Disable"
        customMessage={
          <>
            {disablingStaff?.firstName} {disablingStaff?.lastName} will no longer be able to sign in. This cannot be
            undone from here.
          </>
        }
        errorMessage={disableError}
      />

      <ConfirmationDialog
        isOpen={resettingStaff !== null}
        onClose={() => (resetting ? undefined : setResettingStaff(null))}
        onConfirm={() => void handleConfirmReset()}
        loading={resetting}
        variant="discard"
        confirmButtonText="Reset"
        customMessage={
          <>
            {resettingStaff?.firstName} {resettingStaff?.lastName}'s current password stops working immediately. A
            new setup code is shown once, for them to set a new one.
          </>
        }
        errorMessage={resetError}
      />

      <StyledDialog
        isOpen={resetReveal !== null}
        onClose={() => setResetReveal(null)}
        onSubmit={() => setResetReveal(null)}
        title="Credentials reset"
        maxWidth="tablet"
        actions={
          <Button onClick={() => setResetReveal(null)} variant="contained" autoFocus>
            Done
          </Button>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Write this down now — it is shown only once and cannot be retrieved again.
        </Typography>
        <Stack spacing={1.5}>
          <Typography>
            <strong>Setup code:</strong> {resetReveal}
          </Typography>
        </Stack>
      </StyledDialog>
    </Box>
  )
}
