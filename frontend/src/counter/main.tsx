import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppThemeProvider } from '../shared/theme'
import { CounterShell } from './CounterShell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <CounterShell />
    </AppThemeProvider>
  </StrictMode>,
)
