import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { usePageHeader } from '../../layout/pageHeaderStore'
import { getSession, type OwnerSessionInfo } from '../../../shared/api/ownerAuth'

// The Owner's authenticated landing area. Story 1.4 is activation + login only (FR-25/FR-27) -
// no Owner dashboard yet, that's Epic 2+ - so this just proves the whole flow end-to-end: a
// signed-in Owner lands here and sees who they are and which Mart they're signed into.
export function OwnerArea() {
  const [owner, setOwner] = useState<OwnerSessionInfo | null>(null)

  usePageHeader({
    heading: 'Owner',
    icon: <HomeOutlinedIcon />,
  })

  useEffect(() => {
    let active = true
    // RequireOwnerSession already confirmed a valid session before rendering this component -
    // this fetch is only to get the display fields (martName/firstName/lastName), not to
    // re-check access.
    void getSession().then((result) => {
      if (active && result.ok) {
        setOwner(result.owner)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Box data-testid="owner-area">
      {owner === null ? (
        <Skeleton variant="rounded" height={32} width={280} />
      ) : (
        <Typography variant="body1">
          Signed in as {owner.firstName} {owner.lastName} — {owner.martName}
        </Typography>
      )}
    </Box>
  )
}
