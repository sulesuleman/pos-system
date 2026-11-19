import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { StyledButton } from '../../../shared/common/Buttons/StyledButton'
import { usePageHeader } from '../../layout/pageHeaderStore'
import { MartsList, type MartsListHandle } from './MartsList'
import { CreateMartDialog } from './CreateMartDialog'

// The Super Admin area's landing screen: the Marts list (name, code, status only — the Super
// Admin API never exposes a Mart's business data) plus the "Create Mart" flow.
export function SuperAdminArea() {
  const [dialogOpen, setDialogOpen] = useState(false)
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

  return (
    <Box data-testid="super-admin-area">
      <MartsList ref={martsListRef} />
      <CreateMartDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </Box>
  )
}
