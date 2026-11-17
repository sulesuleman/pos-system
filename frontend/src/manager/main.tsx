import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppThemeProvider } from '../shared/theme'
import { signOut as signOutSuperAdmin } from '../shared/api/superAdminAuth'
import { signOut as signOutOwner } from '../shared/api/ownerAuth'
import { ManagerShell } from './ManagerShell'
import { SignInPage } from './features/auth/SignInPage'
import { OwnerActivatePage } from './features/auth/OwnerActivatePage'
import { OwnerSignInPage } from './features/auth/OwnerSignInPage'
import { SuperAdminArea } from './features/super-admin/SuperAdminArea'
import { OwnerArea } from './features/owner/OwnerArea'
import { RequireSession } from './features/auth/RequireSession'
import { RequireOwnerSession } from './features/auth/RequireOwnerSession'
import { SUPER_ADMIN_NAV_ITEMS, OWNER_NAV_ITEMS } from './layout/navConfig'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Owner/Manager sign-in is the default landing - Super Admin has no link to reach
              their own sign-in from here and must know to type /super-admin/sign-in directly.
              The route itself is /auth/sign-in (not /owners/sign-in) on purpose - generic,
              giving no hint that a separate Super Admin sign-in route exists at all. */}
          <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />
          {/* Sign-in/activation screens own their own full-bleed layout (hero panel + theme
              toggle) and are shown before anyone is authenticated, so they're never wrapped in
              ManagerShell's app bar — that bar belongs to the authenticated areas only. */}
          <Route path="/super-admin/sign-in" element={<SignInPage />} />
          <Route path="/auth/activate" element={<OwnerActivatePage />} />
          <Route path="/auth/sign-in" element={<OwnerSignInPage />} />
          <Route
            element={
              <ManagerShell
                navItems={SUPER_ADMIN_NAV_ITEMS}
                onSignOut={signOutSuperAdmin}
                signOutRedirectPath="/super-admin/sign-in"
              />
            }
          >
            <Route
              path="/super-admin"
              element={
                <RequireSession>
                  <SuperAdminArea />
                </RequireSession>
              }
            />
          </Route>
          <Route
            element={
              <ManagerShell navItems={OWNER_NAV_ITEMS} onSignOut={signOutOwner} signOutRedirectPath="/auth/sign-in" />
            }
          >
            <Route
              path="/owner"
              element={
                <RequireOwnerSession>
                  <OwnerArea />
                </RequireOwnerSession>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
        </Routes>
      </BrowserRouter>
    </AppThemeProvider>
  </StrictMode>,
)
