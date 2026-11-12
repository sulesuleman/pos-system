import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'

// Live E2E check against the REAL backend (dotnet run, not mocks) for Story 1.2's
// backend-1-2-checklist.md item: "re-run the frontend's full I/O matrix live". Scenarios match
// the frozen I/O matrix table in spec-1-2-super-admin-sign-in.md.
//
// Seeds a dedicated, disposable Super Admin test account directly in SQL Server (via sqlcmd),
// using the exact byte format ASP.NET Core Identity's PasswordHasher<T> V3 produces, so it is
// never a real/production account and needs no backend code changes to support testing.

function hashPasswordV3(password: string): string {
  const prf = 1 // KeyDerivationPrf.HMACSHA256
  const iterCount = 100000
  const saltSize = 16
  const subkeyLength = 32
  const salt = randomBytes(saltSize)
  const subkey = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, iterCount, subkeyLength, 'sha256')

  const output = Buffer.alloc(1 + 4 + 4 + 4 + saltSize + subkeyLength)
  let offset = 0
  output.writeUInt8(0x01, offset)
  offset += 1
  output.writeUInt32BE(prf, offset)
  offset += 4
  output.writeUInt32BE(iterCount, offset)
  offset += 4
  output.writeUInt32BE(saltSize, offset)
  offset += 4
  salt.copy(output, offset)
  offset += saltSize
  subkey.copy(output, offset)

  return output.toString('base64')
}

function runSql(query: string): void {
  execFileSync('sqlcmd', ['-S', 'localhost', '-d', 'PosSystem', '-Q', query, '-C'], { stdio: 'pipe' })
}

const testId = randomUUID()
const testEmail = `e2e-test-${testId}@example.com`
const testPassword = 'E2E-Test-Password-123!'

test.beforeAll(() => {
  const hash = hashPasswordV3(testPassword)
  runSql(
    `INSERT INTO SuperAdmins (Id, Email, PasswordHash, CreatedAtUtc) VALUES ('${testId}', '${testEmail}', '${hash}', GETUTCDATE())`,
  )
})

test.afterAll(() => {
  runSql(`DELETE FROM PlatformAuditLogEntries WHERE SuperAdminId = '${testId}'`)
  runSql(`DELETE FROM SuperAdmins WHERE Id = '${testId}'`)
})

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/super-admin/sign-in')
  await page.getByTestId('sign-in-email-input').fill(email)
  await page.getByTestId('sign-in-password-input').fill(password)
  await page.getByTestId('sign-in-submit-button').click()
}

test('sign in with correct credentials redirects to /super-admin, and the session survives a reload', async ({
  page,
}) => {
  await signIn(page, testEmail, testPassword)

  await expect(page).toHaveURL(/\/super-admin$/)
  await expect(page.getByTestId('super-admin-area')).toBeVisible()

  await page.reload()

  await expect(page).toHaveURL(/\/super-admin$/)
  await expect(page.getByTestId('super-admin-area')).toBeVisible()
})

test('sign in with wrong credentials shows a generic error and stays on sign-in', async ({ page }) => {
  await signIn(page, testEmail, 'not-the-right-password')

  await expect(page).toHaveURL(/\/super-admin\/sign-in$/)
  await expect(page.getByTestId('sign-in-error')).toHaveText('Incorrect email or password.')
})

test('visiting /super-admin with no session redirects to sign-in', async ({ page }) => {
  await page.goto('/super-admin')

  await expect(page).toHaveURL(/\/super-admin\/sign-in$/)
})

test('sign out clears the server session and redirects to sign-in', async ({ page }) => {
  await signIn(page, testEmail, testPassword)
  await expect(page).toHaveURL(/\/super-admin$/)

  await page.getByTestId('sign-out-button').click()
  await expect(page).toHaveURL(/\/super-admin\/sign-in$/)

  // Confirms the server-side session was actually cleared (not just local UI state) -
  // revisiting the protected route must redirect again rather than let stale session data in.
  await page.goto('/super-admin')
  await expect(page).toHaveURL(/\/super-admin\/sign-in$/)
})

test('reloading at sign-in, or navigating to it directly, while already authenticated redirects to /super-admin', async ({
  page,
}) => {
  await signIn(page, testEmail, testPassword)
  await expect(page).toHaveURL(/\/super-admin$/)

  await page.goto('/super-admin/sign-in')
  await expect(page).toHaveURL(/\/super-admin$/)

  await page.reload()
  await expect(page).toHaveURL(/\/super-admin$/)
})
