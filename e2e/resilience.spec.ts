import { test, expect } from '@playwright/test'
import { USERS, loadPortal, signInAs } from './helpers'

// The bundled fallback copy of the portal (web src/data/portalData.ts) contains this sample issue.
const BUNDLED_SAMPLE = /Operational Runbooks not finalized/

test.beforeAll(async ({ request }) => {
  await loadPortal(request)
})

test.describe('when the API misbehaves', () => {
  test('API returns 500 on first load: the user is told, and no sample data is shown as if real', async ({ page, request }) => {
    await page.route('**/v1/portal', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL', message: 'boom' } }) }))
    await signInAs(page, request, USERS.ust, '/risks')
    await page.waitForTimeout(1500)
    await expect(page.getByText(BUNDLED_SAMPLE)).toHaveCount(0)
    await expect(page.getByText(/couldn.t|could not|unavailable|failed|try again|error/i).first()).toBeVisible()
  })

  test('slow API: no sample data flashes before the real data arrives', async ({ page, request }) => {
    await page.route('**/v1/portal', async (r) => {
      await new Promise((res) => setTimeout(res, 2000))
      await r.continue()
    })
    await signInAs(page, request, USERS.ust, '/risks')
    await page.waitForTimeout(800)
    await expect(page.getByText(BUNDLED_SAMPLE)).toHaveCount(0)
  })

  test('after one good load, an outage keeps showing the last real data', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await expect(page.getByText(/Operational runbooks for Application Sup/).first()).toBeVisible()
    await page.route('**/v1/portal', (r) => r.abort())
    await page.reload()
    await expect(page.getByText(/Operational runbooks for Application Sup/).first()).toBeVisible()
  })
})
