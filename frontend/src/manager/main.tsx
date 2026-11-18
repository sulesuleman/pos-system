import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppThemeProvider } from '../shared/theme'
import { signOut as signOutSuperAdmin, getSession as getSuperAdminSession } from '../shared/api/superAdminAuth'
import { signOut as signOutOwner, getSession as getOwnerSession } from '../shared/api/ownerAuth'
import type { SidebarUserDisplay } from './layout/Sidebar'
import { ManagerShell } from './ManagerShell'
import { SignInPage } from './features/auth/SignInPage'
import { OwnerActivatePage } from './features/auth/OwnerActivatePage'
import { OwnerSignInPage } from './features/auth/OwnerSignInPage'
import { SuperAdminArea } from './features/super-admin/SuperAdminArea'
import { OwnerArea } from './features/owner/OwnerArea'
import { BranchesPage } from './features/owner/branches/BranchesPage'
import { BranchSelector } from './features/owner/branches/BranchSelector'
import { RequireSession } from './features/auth/RequireSession'
import { RequireOwnerSession } from './features/auth/RequireOwnerSession'
import { SUPER_ADMIN_NAV_ITEMS, OWNER_NAV_ITEMS } from './layout/navConfig'

// Owner's sign-in response already carries firstName/lastName/role - the sidebar's identity row
// just needs it reshaped, not a second API call.
async function getOwnerUserDisplay(): Promise<SidebarUserDisplay | null> {
  const result = await getOwnerSession()
  if (!result.ok) {
    return null
  }
  return { name: `${result.owner.firstName} ${result.owner.lastName}`, caption: result.owner.role }
}

// Super Admin's own session endpoint carries no identifying fields yet (just whether one is
// signed in) - a fixed label is still enough to give the sidebar's profile menu something to
// show (Appearance, Sign out), same as Owner's row, rather than leaving Super Admin on the
// bottom-row fallback meant for "no display at all" session types.
async function getSuperAdminUserDisplay(): Promise<SidebarUserDisplay | null> {
  const result = await getSuperAdminSession()
  return result.ok ? { name: 'Super Admin' } : null
}

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
                getUserDisplay={getSuperAdminUserDisplay}
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
              <ManagerShell
                navItems={OWNER_NAV_ITEMS}
                onSignOut={signOutOwner}
                signOutRedirectPath="/auth/sign-in"
                getUserDisplay={getOwnerUserDisplay}
                branchSelector={<BranchSelector />}
              />
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
            <Route
              path="/owner/branches"
              element={
                <RequireOwnerSession>
                  <BranchesPage />
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
