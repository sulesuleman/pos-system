import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppThemeProvider } from '../shared/theme'
import { ManagerShell } from './ManagerShell'
import { SignInPage } from './features/auth/SignInPage'
import { SuperAdminArea } from './features/super-admin/SuperAdminArea'
import { RequireSession } from './features/auth/RequireSession'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Temporary, reversible default: Story 1.4 (Owner login) will replace this
              redirect with a real chooser/landing. */}
          <Route path="/" element={<Navigate to="/super-admin/sign-in" replace />} />
          {/* The sign-in screen owns its own full-bleed layout (hero panel + theme toggle) and
              is shown before anyone is authenticated, so it is never wrapped in ManagerShell's
              "Manager" app bar — that bar belongs to the authenticated area only. */}
          <Route path="/super-admin/sign-in" element={<SignInPage />} />
          <Route element={<ManagerShell />}>
            <Route
              path="/super-admin"
              element={
                <RequireSession>
                  <SuperAdminArea />
                </RequireSession>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/super-admin/sign-in" replace />} />
        </Routes>
      </BrowserRouter>
    </AppThemeProvider>
  </StrictMode>,
)
