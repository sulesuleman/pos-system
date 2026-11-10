import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

export function CounterShell() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="h1">
          Counter
        </Typography>
      </Toolbar>
    </AppBar>
  )
}
