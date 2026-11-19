import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import { StyledButton } from '../../../../shared/common/Buttons/StyledButton'
import { usePageHeader } from '../../../layout/pageHeaderStore'
import { StaffList, type StaffListHandle } from './StaffList'
import { CreateStaffDialog } from './CreateStaffDialog'

// The Owner's "Staff" screen (Story 2.2, FR-1 slice): the Mart's staff list plus the "Create
// Staff" flow that activates a new Manager. Mirrors SuperAdminArea's own
// list-plus-create-dialog shape.
export function StaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
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

  return (
    <Box data-testid="staff-page">
      <StaffList ref={staffListRef} />
      <CreateStaffDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </Box>
  )
}
