import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { usePageHeader } from '../../layout/pageHeaderStore'
import { getSession, type OwnerSessionInfo } from '../../../shared/api/ownerAuth'

// The Manager's authenticated landing area (Epic 2 minimal slice, FR-25/FR-27) - a Manager signs
// in through the same shared /auth/* endpoints as the Owner (AD-15), so this mirrors OwnerArea's
// own bare "prove the flow end-to-end" placeholder rather than duplicating it as a distinct
// component for no behavioral difference yet. A real Manager dashboard is later Epic 2+ work.
export function ManagerArea() {
  const [manager, setManager] = useState<OwnerSessionInfo | null>(null)

  usePageHeader({
    heading: 'Manager',
    icon: <HomeOutlinedIcon />,
  })

  useEffect(() => {
    let active = true
    // RequireManagerSession already confirmed a valid, Manager-held session before rendering
    // this component - this fetch is only to get the display fields, not to re-check access.
    void getSession().then((result) => {
      if (active && result.ok) {
        setManager(result.owner)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Box data-testid="manager-area">
      {manager === null ? (
        <Skeleton variant="rounded" height={32} width={280} />
      ) : (
        <Typography variant="body1">
          Signed in as {manager.firstName} {manager.lastName} — {manager.martName}
        </Typography>
      )}
    </Box>
  )
}
