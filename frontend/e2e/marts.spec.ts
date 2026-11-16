import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'

// Live E2E check against the REAL backend (dotnet run, not mocks) for Story 1.3's
// backend-1-3-checklist.md item: "re-run the frontend's full I/O matrix live". Everything else
// (empty/loading list states, required/format validation messages, the no-dismiss reveal, reset
// on reopen) is already covered by mocked unit tests in MartsList.test.tsx/CreateMartDialog.test.tsx
// - this file only covers round trips that need the real backend: a successful create showing up
// in the list, and the duplicate-Mart-name rejection (spec-1-3's review finding #7).
//
// Seeds a dedicated, disposable Super Admin test account the same way super-admin-sign-in.spec.ts
// does. All Marts created here get a unique marker in their name so cleanup can find them without
// touching anything a developer created manually in the same local database.

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
const martMarker = `E2E-Marts-${testId}`

test.beforeAll(() => {
  const hash = hashPasswordV3(testPassword)
  runSql(
    `INSERT INTO SuperAdmins (Id, Email, PasswordHash, CreatedAtUtc) VALUES ('${testId}', '${testEmail}', '${hash}', GETUTCDATE())`,
  )
})

test.afterAll(() => {
  runSql(`DELETE FROM Owners WHERE MartId IN (SELECT Id FROM Marts WHERE Name LIKE '%${martMarker}%')`)
  runSql(`DELETE FROM Marts WHERE Name LIKE '%${martMarker}%'`)
  runSql(`DELETE FROM PlatformAuditLogEntries WHERE SuperAdminId = '${testId}'`)
  runSql(`DELETE FROM SuperAdmins WHERE Id = '${testId}'`)
})

async function signIn(page: Page) {
  await page.goto('/super-admin/sign-in')
  await page.getByTestId('sign-in-email-input').fill(testEmail)
  await page.getByTestId('sign-in-password-input').fill(testPassword)
  await page.getByTestId('sign-in-submit-button').click()
  await expect(page).toHaveURL(/\/super-admin$/)
}

async function fillCreateMartForm(page: Page, martName: string) {
  await page.getByRole('button', { name: 'Create Mart' }).click()
  await page.getByLabel(/Mart name/).fill(martName)
  await page.getByLabel(/First name/).fill('Ayesha')
  await page.getByLabel(/Last name/).fill('Khan')
  await page.getByLabel(/Email/).fill(`owner-${randomUUID()}@example.com`)
  await page.getByLabel(/Contact/).fill('+923001234567')
  await page.getByLabel(/CNIC/).fill('1234512345671')
}

test('creating a Mart reveals the one-time codes once, and the Mart then appears in the list', async ({ page }) => {
  await signIn(page)
  const martName = `${martMarker}-${randomUUID()}`

  await fillCreateMartForm(page, martName)
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Mart created')).toBeVisible()
  await expect(page.getByText(/Mart code:/)).toBeVisible()
  await expect(page.getByText(/Owner Staff ID:/)).toBeVisible()
  await expect(page.getByText(/Setup code:/)).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()

  await expect(page.getByRole('cell', { name: martName })).toBeVisible()
  await expect(page.getByRole('row', { name: new RegExp(martName) })).toContainText('active')
})

test('creating a Mart with a name that already exists shows the duplicate-name error, not a generic one', async ({
  page,
}) => {
  await signIn(page)
  const martName = `${martMarker}-${randomUUID()}`

  await fillCreateMartForm(page, martName)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Mart created')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()

  // Same name again - the dialog resets fully on reopen, so fill it fresh.
  await fillCreateMartForm(page, martName)
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('A Mart with this name already exists.')).toBeVisible()
  await expect(page.getByText('Mart created')).not.toBeVisible()
})
