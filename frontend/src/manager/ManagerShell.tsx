import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth, type HealthStatus } from '../shared/api/health'

export function ManagerShell() {
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    let active = true
    void getHealth().then((status) => {
      if (active) {
        setHealth(status)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1">
            Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Typography role="status">
          {health === null ? 'API: checking…' : `API: ${health}`}
        </Typography>
      </Container>
    </>
  )
}
