import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { MartsList, type MartsListHandle } from './MartsList'
import { CreateMartDialog } from './CreateMartDialog'

// The Super Admin area's landing screen: the Marts list (name, code, status only — the Super
// Admin API never exposes a Mart's business data) plus the "Create Mart" flow.
export function SuperAdminArea() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const martsListRef = useRef<MartsListHandle>(null)

  function handleCreated() {
    setDialogOpen(false)
    martsListRef.current?.refresh()
  }

  return (
    <Container sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Marts
        </Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Create Mart
        </Button>
      </Box>
      <MartsList ref={martsListRef} />
      <CreateMartDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </Container>
  )
}
