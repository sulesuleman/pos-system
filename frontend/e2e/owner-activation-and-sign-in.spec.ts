import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'

// Live E2E check against the REAL backend (dotnet run, not mocks) for Story 1.4's
// backend-1-4-checklist.md item: a manual/live run of the activate -> sign-in -> session ->
// sign-out flow. Seeds a disposable Mart + unactivated Owner directly in SQL Server (same
// hashPasswordV3 technique as super-admin-sign-in.spec.ts/marts.spec.ts - ASP.NET Identity's
// PasswordHasher<T> V3 format doesn't depend on T, so the same helper works for an Owner's
// SetupCodeHash too), so this doesn't need to go through the Super Admin "Create Mart" flow just
// to get a Mart code + setup code.

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
const martId = randomUUID()
const ownerId = randomUUID()
const martCode = `E2E${randomUUID().slice(0, 3).toUpperCase()}`
const ownerEmail = `e2e-owner-${testId}@example.com`
const setupCode = 'E2E-SETUP-CODE-123'
const ownerPassword = 'Owner-E2E-Pass1!'

test.beforeAll(() => {
  const setupCodeHash = hashPasswordV3(setupCode)
  runSql(
    `INSERT INTO Marts (Id, Name, Code, Status, CreatedAtUtc) VALUES ('${martId}', 'E2E Owner Mart ${testId}', '${martCode}', 0, GETUTCDATE())`,
  )
  runSql(
    `INSERT INTO Owners (Id, MartId, StaffId, FirstName, LastName, Email, Contact, Cnic, SetupCodeHash, SetupCodeExpiresAtUtc, Role, CreatedAtUtc) ` +
      `VALUES ('${ownerId}', '${martId}', 1, 'Ayesha', 'Khan', '${ownerEmail}', '03001234567', '1234512345671', '${setupCodeHash}', DATEADD(hour, 1, GETUTCDATE()), 'Owner', GETUTCDATE())`,
  )
})

test.afterAll(() => {
  runSql(`DELETE FROM PlatformAuditLogEntries WHERE AttemptedEmail = '${ownerEmail}'`)
  runSql(`DELETE FROM Owners WHERE Id = '${ownerId}'`)
  runSql(`DELETE FROM Marts WHERE Id = '${martId}'`)
})

async function activate(page: Page) {
  await page.goto('/auth/activate')
  await page.getByTestId('owner-activate-mart-code-input').fill(martCode)
  await page.getByTestId('owner-activate-email-input').fill(ownerEmail)
  await page.getByTestId('owner-activate-setup-code-input').fill(setupCode)
  await page.getByTestId('owner-activate-password-input').fill(ownerPassword)
  await page.getByTestId('owner-activate-submit-button').click()
}

async function signIn(page: Page, code: string, email: string, password: string) {
  await page.goto('/auth/sign-in')
  await page.getByTestId('owner-sign-in-mart-code-input').fill(code)
  await page.getByTestId('owner-sign-in-email-input').fill(email)
  await page.getByTestId('owner-sign-in-password-input').fill(password)
  await page.getByTestId('owner-sign-in-submit-button').click()
}

test('activating with the real setup code redirects to sign-in with the activated banner', async ({ page }) => {
  await activate(page)

  await expect(page).toHaveURL(/\/auth\/sign-in$/)
  await expect(page.getByTestId('owner-sign-in-activated-banner')).toBeVisible()
})

test('signing in with the new password redirects to /owner, and the session survives a reload', async ({ page }) => {
  await signIn(page, martCode, ownerEmail, ownerPassword)

  await expect(page).toHaveURL(/\/owner$/)
  await expect(page.getByTestId('owner-area')).toContainText('Signed in as Ayesha Khan')

  await page.reload()

  await expect(page).toHaveURL(/\/owner$/)
  await expect(page.getByTestId('owner-area')).toContainText('Signed in as Ayesha Khan')
})

test('signing in with the wrong password shows a generic error and stays on sign-in', async ({ page }) => {
  await signIn(page, martCode, ownerEmail, 'not-the-right-password')

  await expect(page).toHaveURL(/\/auth\/sign-in$/)
  await expect(page.getByTestId('owner-sign-in-error')).toHaveText("That Mart code, email or password isn't right.")
})

test('visiting /owner with no session redirects to owner sign-in', async ({ page }) => {
  await page.goto('/owner')

  await expect(page).toHaveURL(/\/auth\/sign-in$/)
})

test('owner sign-out clears the server session and redirects to owner sign-in', async ({ page }) => {
  await signIn(page, martCode, ownerEmail, ownerPassword)
  await expect(page).toHaveURL(/\/owner$/)

  await page.getByTestId('sign-out-button').first().click()
  await expect(page).toHaveURL(/\/auth\/sign-in$/)

  await page.goto('/owner')
  await expect(page).toHaveURL(/\/auth\/sign-in$/)
})
